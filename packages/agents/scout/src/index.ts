/**
 * Scout Agent — HTTP server + trigger loop.
 *
 * Endpoints:
 *   POST /trigger  — crawl all SEED_SITES and publish raw listings
 *   GET  /health   — liveness check
 */

import http from "http";
import * as cheerio from "cheerio";
import { PubSub } from "@google-cloud/pubsub";
import { SEED_SITES, MAX_PAGES_PER_SITE, CRAWL_INTERVAL_SECONDS, SEED_CONFIG_SOURCE } from "./config";
import type { SeedSite } from "./config";

// ─── Config ───────────────────────────────────────────────────────────────────

const OUTPUT_TOPIC = process.env.PUBSUB_TOPIC ?? "scout-raw-listings";
const PORT = Number(process.env.PORT ?? 8080);

// ─── Bot Identification ───────────────────────────────────────────────────────

const BOT_NAME = "ukfreecomps-bot";
const BOT_VERSION = "0.1";
const BOT_CONTACT_URL = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/bot` : "https://YOURDOMAIN.com/bot";
const BOT_CONTACT_EMAIL = "bot@YOURDOMAIN.com";

const USER_AGENT = `Mozilla/5.0 (compatible; ${BOT_NAME}/${BOT_VERSION}; +${BOT_CONTACT_URL})`;
const FROM_HEADER = BOT_CONTACT_EMAIL;

// ─── Pub/Sub ──────────────────────────────────────────────────────────────────

const pubsub = new PubSub();
const topic = pubsub.topic(OUTPUT_TOPIC);

async function publish(payload: unknown): Promise<void> {
    const data = Buffer.from(JSON.stringify(payload));
    await topic.publishMessage({ data });
}

// ─── Crawl logic ──────────────────────────────────────────────────────────────

/**
 * Fetches `url` and returns the raw HTML body.
 * In a later iteration this will drive Puppeteer / Playwright for JS-heavy pages.
 */
async function fetchPage(url: string): Promise<string> {
    const res = await fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
            "From": FROM_HEADER,
            Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return res.text();
}

// ─── Robots.txt ───────────────────────────────────────────────────────────────

/** Per-host disallow list, populated lazily on first crawl to that host. */
const robotsCache = new Map<string, string[]>();

/**
 * Parse the `User-agent: *` block from a robots.txt body and return the list
 * of disallowed path prefixes (lower-cased).
 */
function parseDisallowed(robotsTxt: string): string[] {
    const disallowed: string[] = [];
    let inStarBlock = false;

    for (const rawLine of robotsTxt.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (/^user-agent:\s*\*/i.test(line)) {
            inStarBlock = true;
            continue;
        }
        // A new User-agent directive ends the current block.
        if (/^user-agent:/i.test(line)) {
            inStarBlock = false;
            continue;
        }
        if (inStarBlock && /^disallow:/i.test(line)) {
            const path = line.replace(/^disallow:\s*/i, "").trim();
            if (path) disallowed.push(path.toLowerCase());
        }
    }

    return disallowed;
}

/**
 * Fetch and cache robots.txt for the origin of `url`.
 * Returns gracefully on any error:
 *  - 404 → no restrictions (empty list)
 *  - network failure → conservatively block the URL (returns ["/"])
 */
async function loadRobots(origin: string): Promise<void> {
    if (robotsCache.has(origin)) return; // already cached for this process lifetime

    const robotsUrl = `${origin}/robots.txt`;
    try {
        const res = await fetch(robotsUrl, {
            headers: {
                "User-Agent": USER_AGENT,
                "From": FROM_HEADER,
            },
            signal: AbortSignal.timeout(8_000),
        });
        if (res.status === 404) {
            console.log(`[scout] robots.txt not found for ${origin} — no restrictions`);
            robotsCache.set(origin, []);
            return;
        }
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        const disallowed = parseDisallowed(text);
        robotsCache.set(origin, disallowed);
        console.log(
            `[scout] robots.txt loaded for ${origin} — ${disallowed.length
            } disallow rule(s): ${disallowed.slice(0, 5).join(", ") || "none"}`
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
            `[scout] could not fetch robots.txt for ${origin} (${msg}) — conservatively blocking`
        );
        // Block everything on error to be safe.
        robotsCache.set(origin, ["/"]);
    }
}

/**
 * Returns true if the URL is allowed to be crawled according to cached robots rules.
 * Ensures robots.txt is loaded first (lazy, once per host per process).
 */
async function isAllowed(url: string): Promise<boolean> {
    const parsed = new URL(url);
    const origin = parsed.origin; // e.g. "https://www.loquax.co.uk"
    await loadRobots(origin);

    const disallowed = robotsCache.get(origin) ?? [];
    const path = parsed.pathname.toLowerCase();

    for (const rule of disallowed) {
        if (path.startsWith(rule)) {
            return false;
        }
    }
    return true;
}

// ─── URL Resolver ─────────────────────────────────────────────────────────────

/**
 * Follows redirects to find the final destination URL.
 * Targeted at aggregator "out" links.
 */
async function resolveUrl(url: string, sourceOrigin: string): Promise<string> {
    try {
        const parsed = new URL(url);
        // If it's already a different domain than where we found it, it's likely a direct link
        // (but some aggregators use direct links that still redirect, we follow anyway)

        const res = await fetch(url, {
            method: "HEAD",
            headers: { "User-Agent": USER_AGENT },
            redirect: "follow",
            signal: AbortSignal.timeout(5000),
        });

        const finalUrl = res.url || url;
        const finalParsed = new URL(finalUrl);

        // If it's still on the same aggregator origin, it might be a internal "interstitial" or just a forum post
        // We return it anyway, but we've at least followed any quick redirects.
        return finalUrl;
    } catch (err) {
        // Fallback to original URL on timeout or error
        return url;
    }
}

// ─── Link Discovery ───────────────────────────────────────────────────────────

interface DiscoveredEntry {
    url: string;
    title: string;
    context: string;
}

/**
 * Heuristics to extract individual competition links and their surrounding context.
 */
function discoverLinks(html: string, baseUrl: string, siteType: string): DiscoveredEntry[] {
    const $ = cheerio.load(html);
    const results: DiscoveredEntry[] = [];
    const seenUrls = new Set<string>();

    // Common containers for individual listings
    const entrySelectors = [
        "li",
        "article",
        "tr",
        ".competition",
        ".listing",
        ".thread",
        ".post",
        ".item",
    ];

    // Attempt to find structured entries first
    let foundStructured = false;
    const baseOrigin = new URL(baseUrl).origin;

    for (const selector of entrySelectors) {
        const potentialEntries = $(selector).has("a");
        if (potentialEntries.length >= 5) {
            // High confidence it's a list
            potentialEntries.each((_, el) => {
                const link = $(el).find("a").first();
                const href = link.attr("href");
                if (!href) return;

                try {
                    const absoluteUrl = new URL(href, baseUrl).toString();
                    if (seenUrls.has(absoluteUrl)) return;

                    const lowerHref = absoluteUrl.toLowerCase();
                    const urlParsed = new URL(absoluteUrl);

                    // --- STRICT FILTERING FOR "DIRECT" DISCOVERY ---
                    // 1. Ignore login/reg/terms
                    if (lowerHref.includes("login") || lowerHref.includes("register")) return;
                    if (lowerHref.includes("terms") || lowerHref.includes("privacy") || lowerHref.includes("cookies")) return;

                    // 2. Ignore internal links to common aggregator sections (search, forum index, member profiles)
                    if (urlParsed.origin === baseOrigin) {
                        const path = urlParsed.pathname;
                        if (path === "/" || path === "/index.php" || path === "/forum.php") return;
                        if (path.startsWith("/members/") || path.startsWith("/search/")) return;
                        if (path.startsWith("/style/")) return; // CSS/assets
                    }

                    const title = link.text().trim() || $(el).text().trim().slice(0, 50);
                    if (title.length < 5) return;

                    results.push({
                        url: absoluteUrl,
                        title,
                        context: $.html(el), // Focused HTML for this one entry
                    });
                    seenUrls.add(absoluteUrl);
                } catch {
                    /* ignore */
                }
            });
            foundStructured = true;
            break;
        }
    }

    // Fallback: Just grab and Filter every link if no structure found
    if (!foundStructured) {
        $("a").each((_, el) => {
            const href = $(el).attr("href");
            if (!href) return;

            try {
                const absoluteUrl = new URL(href, baseUrl).toString();
                if (seenUrls.has(absoluteUrl)) return;

                const urlParsed = new URL(absoluteUrl);
                const isExternal = urlParsed.origin !== baseOrigin;
                const linkText = $(el).text().trim();
                const lowerText = linkText.toLowerCase();
                const keywords = ["win", "competition", "prize", "giveaway", "draw"];

                // On aggregators, we REALLY prefer external links OR links containing "out" / "exit"
                const isOutLink = lowerText.includes("enter") || absoluteUrl.includes("/out") || absoluteUrl.includes("/exit");

                if (keywords.some((k) => lowerText.includes(k)) || (isExternal && isOutLink)) {
                    results.push({
                        url: absoluteUrl,
                        title: linkText,
                        context: $.html($(el).parent()),
                    });
                    seenUrls.add(absoluteUrl);
                }
            } catch {
                /* ignore */
            }
        });
    }

    // Sort: prioritise external links as they are more likely to be the destination
    return results
        .filter((r) => r.title.length > 3)
        .sort((a, b) => {
            const aExt = new URL(a.url).origin !== baseOrigin;
            const bExt = new URL(b.url).origin !== baseOrigin;
            if (aExt && !bExt) return -1;
            if (!aExt && bExt) return 1;
            return 0;
        })
        .slice(0, 40); // cap at 40 per landing page
}

// ─── Polite delay ─────────────────────────────────────────────────────────────

const INTER_REQUEST_DELAY_MS = 2_000;

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Crawl a single site entry.
 *
 * For now we fetch only the entry-point URL (pages = 1) regardless of
 * MAX_PAGES_PER_SITE. Pagination support will be added once we have
 * per-site scraping rules — the `maxPages` parameter is already threaded
 * through so the signature won't change.
 *
 * Returns the number of raw listings published.
 */
async function crawl(site: SeedSite, maxPages: number): Promise<number> {
    const pagesToCrawl = Math.min(maxPages, 1); // TODO: increment when pagination is implemented
    let published = 0;

    for (let page = 1; page <= pagesToCrawl; page++) {
        const url = page === 1 ? site.url : `${site.url}?page=${page}`;
        console.log(
            `[scout] crawl  site="${site.name}" type=${site.type} page=${page}/${pagesToCrawl} url=${url}`
        );

        // ── Robots check ──────────────────────────────────────────────────────
        let allowed = false;
        try {
            allowed = await isAllowed(url);
        } catch {
            allowed = false;
        }
        if (!allowed) {
            console.warn(
                `[scout] skipping  site="${site.name}" page=${page} — disallowed by robots.txt`
            );
            continue;
        }

        try {
            const html = await fetchPage(url);

            if (site.type === "aggregator" || site.type === "forum") {
                const entries = discoverLinks(html, url, site.type);
                console.log(`[scout] discovered ${entries.length} entries on ${site.name}`);

                for (const entry of entries) {
                    // Resolve redirects for aggregator links
                    const resolvedUrl = await resolveUrl(entry.url, url);
                    if (resolvedUrl !== entry.url) {
                        console.log(`[scout] resolved: ${entry.url.slice(0, 40)}... -> ${resolvedUrl.slice(0, 40)}...`);
                    }

                    await publish({
                        sourceUrl: resolvedUrl,
                        sourceSite: site.name,
                        siteType: site.type,
                        fetchedAt: new Date().toISOString(),
                        htmlExcerpt: entry.context.slice(0, 5000), // Focused snippet
                        title: entry.title,
                    });
                    published++;
                }
            } else {
                // Direct brand page — publish at once
                await publish({
                    sourceUrl: url,
                    sourceSite: site.name,
                    siteType: site.type,
                    fetchedAt: new Date().toISOString(),
                    htmlExcerpt: html.slice(0, 50000), // Larger excerpt for brand pages
                });
                published++;
            }

            console.log(`[scout] processed site="${site.name}" page=${page} — published ${published} listings total`);

            // ── Polite delay ──────────────────────────────────────────────────
            // Wait between requests to avoid hammering any single site.
            await sleep(INTER_REQUEST_DELAY_MS);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[scout] fetch failed  site="${site.name}" page=${page}: ${msg}`);
            // Continue to other pages / sites rather than aborting the whole trigger.
        }
    }

    return published;
}

// ─── Trigger handler ──────────────────────────────────────────────────────────

async function runTrigger(): Promise<{ sites: number; published: number }> {
    console.log(
        `[scout] trigger started — ${SEED_SITES.length} sites, maxPages=${MAX_PAGES_PER_SITE}`
    );

    let totalPublished = 0;

    // Crawl sites sequentially to be a polite crawler.
    for (const site of SEED_SITES) {
        const count = await crawl(site, MAX_PAGES_PER_SITE);
        totalPublished += count;
    }

    console.log(
        `[scout] trigger complete — published ${totalPublished} raw listings from ${SEED_SITES.length} sites`
    );

    return { sites: SEED_SITES.length, published: totalPublished };
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
    // POST /trigger
    if (req.method === "POST" && req.url === "/trigger") {
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "accepted" }));

        // Run asynchronously so Cloud Scheduler gets an immediate 202.
        runTrigger().catch((err) => {
            console.error("[scout] trigger error:", err instanceof Error ? err.message : err);
        });

        return;
    }

    // GET /health
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                status: "OK",
                topic: OUTPUT_TOPIC,
                sites: SEED_SITES.length,
                crawlIntervalSeconds: CRAWL_INTERVAL_SECONDS,
                maxPagesPerSite: MAX_PAGES_PER_SITE,
            })
        );
        return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
    console.log(`[scout] bot identity: ${BOT_NAME}/${BOT_VERSION} | contact: ${BOT_CONTACT_URL} / ${BOT_CONTACT_EMAIL}`);
    console.log(`[scout] seed config: ${SEED_CONFIG_SOURCE}`);
    console.log(
        `[scout] listening on port ${PORT} | topic: ${OUTPUT_TOPIC} | sites: ${SEED_SITES.length} | maxPages: ${MAX_PAGES_PER_SITE} | interval: ${CRAWL_INTERVAL_SECONDS}s`
    );
});
