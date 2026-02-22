"use strict";

const http = require("http");
const puppeteer = require("puppeteer");
const { PubSub } = require("@google-cloud/pubsub");

// ─── Config ──────────────────────────────────────────────────────────────────

const PUBSUB_TOPIC = process.env.PUBSUB_TOPIC || "scout-raw-listings";
const PORT = process.env.PORT || 8080;
const MAX_HTML_CHARS = 50_000;

const pubsub = new PubSub();
const topic = pubsub.topic(PUBSUB_TOPIC);

// ─── Crawler ─────────────────────────────────────────────────────────────────

/**
 * Launch Puppeteer, scrape `url`, publish a JSON payload to Pub/Sub,
 * and return the payload.
 *
 * @param {string} url
 * @returns {Promise<{ url: string, scrapedAt: string, title: string, html: string }>}
 */
async function crawl(url) {
    const executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";

    const browser = await puppeteer.launch({
        executablePath,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
        ],
        headless: "new",
    });

    try {
        const page = await browser.newPage();

        await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: 30_000,
        });

        const [title, rawHtml] = await Promise.all([
            page.title(),
            page.content(),
        ]);

        const payload = {
            url,
            scrapedAt: new Date().toISOString(),
            title,
            html: rawHtml.slice(0, MAX_HTML_CHARS),
        };

        const messageBuffer = Buffer.from(JSON.stringify(payload));
        await topic.publish(messageBuffer);

        console.log(`[scout] Published: ${url} (${messageBuffer.length} bytes) → ${PUBSUB_TOPIC}`);

        return payload;
    } finally {
        await browser.close();
    }
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
    const { method, url: reqUrl } = req;

    // GET /health
    if (method === "GET" && reqUrl === "/health") {
        const body = JSON.stringify({ status: "OK", topic: PUBSUB_TOPIC });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(body);
        return;
    }

    // POST /trigger
    if (method === "POST" && reqUrl === "/trigger") {
        const testUrl = "https://example.com/competition";
        try {
            const result = await crawl(testUrl);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
        } catch (err) {
            console.error("[scout] crawl error:", err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // 404 — all other routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
    console.log(`[scout] Listening on port ${PORT} — topic: ${PUBSUB_TOPIC}`);
});
