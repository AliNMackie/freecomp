import { SEED_SITES } from "./config";
import * as cheerio from "cheerio";

// Mock version of discoverLinks for local testing
function discoverLinks(html: string, baseUrl: string, siteType: string) {
    const $ = cheerio.load(html);
    const results: any[] = [];
    const seenUrls = new Set<string>();

    const entrySelectors = ["li", "article", "tr", ".competition", ".listing", ".thread", ".post", ".item"];

    let foundStructured = false;
    for (const selector of entrySelectors) {
        const potentialEntries = $(selector).has("a");
        if (potentialEntries.length >= 1) { // lowered for test
            potentialEntries.each((_, el) => {
                const link = $(el).find("a").first();
                const href = link.attr("href");
                if (!href) return;

                try {
                    const absoluteUrl = new URL(href, baseUrl).toString();
                    if (seenUrls.has(absoluteUrl)) return;

                    const title = link.text().trim() || $(el).text().trim().slice(0, 50);
                    results.push({
                        url: absoluteUrl,
                        title,
                        context: $.html(el).slice(0, 100),
                    });
                    seenUrls.add(absoluteUrl);
                } catch { }
            });
            foundStructured = true;
            break;
        }
    }

    return results;
}

const mockHtml = `
    <ul>
        <li><a href="/comp1">Win a Tesla!</a> - Ends soon</li>
        <li><a href="/comp2">£1000 Cash Giveaway</a> - Easy entry</li>
        <li><a href="/comp1">Win a Tesla!</a> - DUPLICATE</li>
    </ul>
`;

console.log("Testing discovery...");
const results = discoverLinks(mockHtml, "https://example.com", "aggregator");
console.log("Found:", results.length);
results.forEach(r => console.log(` - [${r.title}] -> ${r.url}`));
