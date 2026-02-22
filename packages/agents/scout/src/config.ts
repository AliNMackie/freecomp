import fs from "fs";
import path from "path";

/**
 * Scout agent configuration.
 *
 * SEED_SITES is the single source of truth for which sites the scout crawls.
 * Add real UK competition URLs here — the crawl logic never needs to change.
 */

export interface SeedSite {
    /** Human-readable label used in logs. */
    name: string;
    /** Entry-point URL the scout will request on each trigger. */
    url: string;
    /**
     * 'aggregator' — a site listing many competitions (e.g. Loquax, ThePrizeFinder).
     * 'brand'      — a single brand's own competition page.
     * 'forum'      — community thread / forum category.
     */
    type: "aggregator" | "brand" | "forum";
}

// ─── Default Site list ───────────────────────────────────────────────────────
// Replace / extend these placeholders with real URLs before go-live.

const DEFAULT_SEED_SITES: SeedSite[] = [
    // ── Aggregators ──────────────────────────────────────────────────────────────
    {
        name: "Loquax",
        url: "https://www.loquax.co.uk/",
        type: "aggregator",
    },
    {
        name: "The Prize Finder",
        url: "https://www.theprizefinder.com/",
        type: "aggregator",
    },
    {
        name: "Competition Database",
        url: "https://www.competitiondatabase.co.uk/",
        type: "aggregator",
    },
    {
        name: "Magic Freebies Competitions",
        url: "https://www.magicfreebies.co.uk/competitions/",
        type: "aggregator",
    },

    // ── Brand pages ──────────────────────────────────────────────────────────────
    {
        name: "Example Brand A",
        url: "https://example.com/competitions",
        type: "brand",
    },
    {
        name: "Example Brand B",
        url: "https://brand-b.example.com/win",
        type: "brand",
    },

    // ── Forums ───────────────────────────────────────────────────────────────────
    {
        name: "MSE Competitions Forum",
        url: "https://forums.moneysavingexpert.com/categories/competitions",
        type: "forum",
    },
    {
        name: "HotUKDeals Competitions",
        url: "https://www.hotukdeals.com/tag/competition",
        type: "forum",
    },
];

/** 
 * Loads seed sites from an external JSON file if SCOUT_SEED_CONFIG_PATH is set.
 * Otherwise, falls back to DEFAULT_SEED_SITES.
 */
function loadSeedSites(): { sites: SeedSite[]; source: string } {
    const configPath = process.env.SCOUT_SEED_CONFIG_PATH;

    if (!configPath) {
        return { sites: DEFAULT_SEED_SITES, source: "default (built-in)" };
    }

    try {
        const absolutePath = path.resolve(configPath);
        if (!fs.existsSync(absolutePath)) {
            console.warn(`[scout] config file not found: ${absolutePath} — falling back to default`);
            return { sites: DEFAULT_SEED_SITES, source: `default (built-in, file not found: ${configPath})` };
        }

        const content = fs.readFileSync(absolutePath, "utf-8");
        const parsed = JSON.parse(content);

        if (!Array.isArray(parsed)) {
            throw new Error("Config must be a JSON array");
        }

        // Basic validation
        const validSites = parsed.filter((site: any) =>
            site && typeof site.name === "string" &&
            typeof site.url === "string" &&
            ["aggregator", "brand", "forum"].includes(site.type)
        );

        if (validSites.length === 0 && parsed.length > 0) {
            throw new Error("No valid seed sites found in JSON config");
        }

        return {
            sites: validSites,
            source: `file (${absolutePath}, loaded ${validSites.length} sites)`
        };
    } catch (err) {
        console.error(`[scout] failed to load seed config from ${configPath}:`, err instanceof Error ? err.message : err);
        return { sites: DEFAULT_SEED_SITES, source: `default (built-in, error loading ${configPath})` };
    }
}

const loadedConfig = loadSeedSites();

export const SEED_SITES = loadedConfig.sites;
export const SEED_CONFIG_SOURCE = loadedConfig.source;

// ─── Crawl constants ──────────────────────────────────────────────────────────

/** Maximum number of paginated pages to crawl per site per trigger. */
export const MAX_PAGES_PER_SITE: number =
    parseInt(process.env.MAX_PAGES_PER_SITE ?? "5", 10);

/** Seconds between scheduled crawl runs (used by Cloud Scheduler). */
export const CRAWL_INTERVAL_SECONDS: number =
    parseInt(process.env.CRAWL_INTERVAL_SECONDS ?? "3600", 10);
