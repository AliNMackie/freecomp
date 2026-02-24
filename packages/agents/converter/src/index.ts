import http from "http";
import { PubSub, Message } from "@google-cloud/pubsub";
import type { Competition } from "@ukfreecomps/shared";

// ─── Config ──────────────────────────────────────────────────────────────────

const INPUT_TOPIC = process.env.INPUT_TOPIC ?? "scout-raw-listings";
const OUTPUT_TOPIC = process.env.OUTPUT_TOPIC ?? "converter-validated-listings";
const SUBSCRIPTION_NAME =
    process.env.SUBSCRIPTION_NAME ?? "converter-scout-sub";
const PORT = process.env.PORT ?? "8080";

// Gemini config (optional — heuristics are used when absent)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
const GEMINI_TIMEOUT_MS = 12_000;
const HTML_EXCERPT_CHARS = 4_000;
const CURATED_SUMMARY_MAX_CHARS = 400;
const GEMINI_MAX_RETRIES = 2;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoutPayload {
    url: string;
    scrapedAt: string;
    title: string;
    html: string;
}

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
}

// ─── Pub/Sub setup ────────────────────────────────────────────────────────────

const pubsub = new PubSub();
const outputTopic = pubsub.topic(OUTPUT_TOPIC);

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(html: string, tag: string): string | null {
    const match = new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, "is").exec(html);
    return match ? stripHtml(match[1]).trim() || null : null;
}

// ─── Heuristic enrichment ─────────────────────────────────────────────────────

function inferPrizeSummary(html: string, pageTitle: string): string {
    const candidates = [
        extractTag(html, "h1"),
        extractTag(html, "h2"),
        pageTitle.trim() || null,
    ].filter((s): s is string => !!s && s.length > 5);

    const best =
        candidates
            .filter((s) => s.length <= 120)
            .sort((a, b) => b.length - a.length)[0] ?? candidates[0];

    return best ? best.slice(0, 120) : "Prize details to be confirmed";
}

function estimateEntryTime(html: string): string {
    const lower = html.toLowerCase();
    const socialSignals = [
        "follow us", "follow @", "retweet", "share this",
        "tag a friend", "tag someone", "instagram", "facebook share", "twitter",
    ];
    if (socialSignals.some((s) => lower.includes(s))) return "2–3 minutes";

    const simpleSignals = [
        'type="email"', 'name="email"', 'type="text"',
        'name="name"', 'name="firstname"', 'name="first_name"',
    ];
    if (simpleSignals.some((s) => lower.includes(s))) return "30–60 seconds";

    return "1–2 minutes";
}

interface HypeRule {
    keywords: string[];
    score: number;
}

const HYPE_RULES: HypeRule[] = [
    { keywords: ["holiday", "cruise", "flight", "vacation", "safari", "travel"], score: 9 },
    { keywords: ["macbook", "iphone", "ps5", "playstation", "xbox", "gaming laptop", "ipad"], score: 9 },
    { keywords: ["car", "vehicle", "van", "motorbike", "tesla", "bmw"], score: 8 },
    { keywords: ["£10,000", "£5,000", "£2,000", "£1,500", "£1,000", "cash prize"], score: 10 },
    { keywords: ["£500", "£750", "£800", "amazon voucher", "gift card"], score: 8 },
    { keywords: ["spa", "experience", "event ticket", "concert", "festival"], score: 7 },
    { keywords: ["kitchen", "appliance", "dyson", "hoover", "vacuum", "coffee machine"], score: 6 },
    { keywords: ["book", "subscription", "hamper", "beauty", "skincare"], score: 5 },
    { keywords: ["t-shirt", "cap", "mug", "keyring", "badge", "sticker"], score: 3 },
    { keywords: ["sample", "trial", "freebie", "goodie bag"], score: 4 },
];

function scoreHype(title: string, prizeSummary: string): number {
    const haystack = `${title} ${prizeSummary}`.toLowerCase();
    let best = 5;
    for (const rule of HYPE_RULES) {
        if (rule.keywords.some((kw) => haystack.includes(kw))) {
            if (rule.score > best) best = rule.score;
        }
    }
    return best;
}

function buildHeuristicSummary(
    title: string,
    sourceSite: string,
    prizeSummary: string,
    entryTime: string,
    hypeScore: number
): string {
    const prizeIntros = [
        `Up for grabs from ${sourceSite} is ${prizeSummary.replace(/\.$/, "")}.`,
        `${sourceSite} is running a competition where you could win ${prizeSummary.replace(/\.$/, "")}.`,
        `This giveaway from ${sourceSite} features ${prizeSummary.replace(/\.$/, "")} as the top prize.`,
    ];
    const effortLines: Record<string, string> = {
        "30–60 seconds": "Entry is lightning-fast — just fill in a couple of details and you're done.",
        "2–3 minutes": "Entry involves a few extra steps such as following on social media, but it shouldn't take long.",
        "1–2 minutes": "It takes only a minute or two to complete your entry.",
    };
    const hypeLine =
        hypeScore >= 8
            ? "This one is well worth entering — high prize value and a solid chance for dedicated deal hunters."
            : hypeScore >= 6
                ? "A decent competition with a worthwhile prize — add it to your entry list today."
                : "A nice little freebie — low effort and something to add to your daily entries.";

    const intro = prizeIntros[title.length % prizeIntros.length];
    const effort = effortLines[entryTime] ?? "Entry is quick and straightforward.";
    return `${intro} ${effort} ${hypeLine}`;
}

// ─── Gemini summary generation ────────────────────────────────────────────────

function buildSummaryPrompt(
    title: string,
    sourceSite: string,
    htmlExcerpt: string
): string {
    return `You are helping write short, human-sounding descriptions of online prize competitions for a UK competition listing site.

Input:
- Proposed Title: ${title}
- Found on: ${sourceSite} (This is the aggregator or forum, NOT necessarily the prize provider)
- HTML snippet: ${htmlExcerpt.slice(0, HTML_EXCERPT_CHARS)}

Task:
Write 2–3 natural sentences that:
- Identify the REAL prize being offered.
- Identify the ACTUAL brand running the competition if mentioned (e.g. "Lidl", "Tesco", "Magic Radio").
- Briefly describe the entry method (e.g. "simple form", "social media share", "trivia question").
- Sounds like a real human "comper" recommending it to a friend.

Constraints:
- Do NOT describe ${sourceSite} itself (we know it's a listing site).
- If the HTML appears to be just an advertisement for ${sourceSite}, return "HOUSE_AD".
- Do NOT copy text verbatim; always paraphrase.
- Return only the description text, no JSON or quotes.`;
}

/**
 * Call the Gemini API to generate a curatedSummary.
 * Returns the raw text response, or throws on failure.
 */
async function callGeminiSummary(
    input: { title: string; sourceSite: string; html_excerpt: string }
): Promise<string> {
    const prompt = buildSummaryPrompt(input.title, input.sourceSite, input.html_excerpt);

    const modelName = GEMINI_MODEL.startsWith("models/") ? GEMINI_MODEL : `models/${GEMINI_MODEL}`;
    const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const body = JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            // Plain text response — no JSON schema for summaries
            temperature: 0.7,
            maxOutputTokens: 150,
        },
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    const start = Date.now();

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            signal: controller.signal,
        });

        const elapsedMs = Date.now() - start;

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`Gemini summary HTTP ${res.status} (${elapsedMs}ms): ${errText.slice(0, 200)}`);
        }

        const json = (await res.json()) as GeminiResponse;
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

        if (typeof text !== "string" || !text.trim()) {
            throw new Error(`Gemini summary had no text content (${elapsedMs}ms)`);
        }

        console.log(
            `[converter] Gemini summary generated in ${elapsedMs}ms ` +
            `(${text.trim().length} chars)`
        );
        return text.trim();
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Generate a curatedSummary using Gemini when available, with retry logic.
 * Falls back to the heuristic summary on any failure.
 * The result is always capped at CURATED_SUMMARY_MAX_CHARS and never empty.
 */
async function generateCuratedSummaryWithGemini(input: {
    title: string;
    sourceSite: string;
    html_excerpt: string;
    heuristicFallback: string;
}): Promise<string> {
    if (!GEMINI_API_KEY) {
        return capSummary(input.heuristicFallback);
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
        try {
            const summary = await callGeminiSummary({
                title: input.title,
                sourceSite: input.sourceSite,
                html_excerpt: input.html_excerpt,
            });
            const capped = capSummary(summary);
            if (capped) return capped;
            throw new Error("Gemini returned empty summary");
        } catch (err) {
            lastError = err;
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[converter] Gemini summary attempt ${attempt}/${GEMINI_MAX_RETRIES} failed: ${msg}`);
        }
    }

    console.warn(
        `[converter] Gemini summary failed after ${GEMINI_MAX_RETRIES} attempts — using heuristic fallback. ` +
        `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
    return capSummary(input.heuristicFallback);
}

function capSummary(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return "A competition listed on UKFreeComps — click through for full details.";
    return trimmed.length <= CURATED_SUMMARY_MAX_CHARS
        ? trimmed
        : trimmed.slice(0, CURATED_SUMMARY_MAX_CHARS - 1) + "…";
}

// ─── Core transform ───────────────────────────────────────────────────────────

async function toCompetition(payload: any): Promise<Competition> {
    // Handle both old and new payload schemas for robustness
    const url = payload.sourceUrl ?? payload.url;
    const scrapedAt = payload.fetchedAt ?? payload.scrapedAt ?? new Date().toISOString();
    const title = payload.title ?? payload.sourceSite ?? "Unknown Competition";
    const html = payload.htmlExcerpt ?? payload.html ?? "";

    let sourceSite: string;
    try {
        sourceSite = new URL(url).hostname.replace(/^www\./, "");
    } catch {
        sourceSite = payload.sourceSite ?? "unknown";
    }

    const prizeSummary = inferPrizeSummary(html, title);
    const entryTimeEstimate = estimateEntryTime(html);
    const hypeScore = scoreHype(title, prizeSummary);

    const heuristicSummary = buildHeuristicSummary(
        title, sourceSite, prizeSummary, entryTimeEstimate, hypeScore
    );

    const curatedSummary = await generateCuratedSummaryWithGemini({
        title,
        sourceSite,
        html_excerpt: html,
        heuristicFallback: heuristicSummary,
    });

    return {
        id: crypto.randomUUID(),
        sourceUrl: url,
        sourceSite,
        title,
        prizeSummary,
        prizeValueEstimate: null,
        closesAt: null,
        isFree: true,
        hasSkillQuestion: /skill|question|answer|tie.?break/i.test(html),
        entryTimeEstimate,
        hypeScore,
        curatedSummary,
        discoveredAt: scrapedAt,
        verifiedAt: null,
    };
}

async function processPayload(raw: ScoutPayload): Promise<Competition> {
    const competition = await toCompetition(raw);
    const buffer = Buffer.from(JSON.stringify(competition));
    await outputTopic.publish(buffer);
    console.log(
        `[converter] Published id=${competition.id} hype=${competition.hypeScore} ` +
        `geminiSummary=${!!GEMINI_API_KEY} (${competition.sourceUrl}) → ${OUTPUT_TOPIC}`
    );
    return competition;
}

// ─── Pub/Sub subscriber ───────────────────────────────────────────────────────

async function startSubscriber(): Promise<void> {
    const topic = pubsub.topic(INPUT_TOPIC);
    const subscription = topic.subscription(SUBSCRIPTION_NAME);

    const [exists] = await subscription.exists();
    if (!exists) {
        await subscription.create();
        console.log(`[converter] Created subscription: ${SUBSCRIPTION_NAME}`);
    }

    subscription.on("message", async (message: Message) => {
        let raw: ScoutPayload;
        try {
            raw = JSON.parse(message.data.toString()) as ScoutPayload;
        } catch (err) {
            console.error("[converter] Failed to parse message:", err);
            message.ack();
            return;
        }

        try {
            await processPayload(raw);
            message.ack();
        } catch (err) {
            console.error("[converter] Failed to process message:", err);
            message.nack();
        }
    });

    subscription.on("error", (err: Error) => {
        console.error("[converter] Subscription error:", err);
    });

    console.log(
        `[converter] Listening on subscription: ${SUBSCRIPTION_NAME} (topic: ${INPUT_TOPIC})`
    );
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}

const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                status: "OK",
                inputTopic: INPUT_TOPIC,
                outputTopic: OUTPUT_TOPIC,
                geminiModel: GEMINI_MODEL,
                geminiConfigured: !!GEMINI_API_KEY,
            })
        );
        return;
    }

    if (req.method === "POST" && req.url === "/test") {
        try {
            const body = await readBody(req);
            const raw = JSON.parse(body) as ScoutPayload;

            if (!raw.url || !raw.title) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "url and title are required" }));
                return;
            }

            raw.scrapedAt ??= new Date().toISOString();
            raw.html ??= "";

            const competition = await processPayload(raw);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(competition));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("[converter] /test error:", err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: message }));
        }
        return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

(async () => {
    await startSubscriber();
    server.listen(Number(PORT), () => {
        console.log(
            `[converter] HTTP server listening on port ${PORT} ` +
            `| ${INPUT_TOPIC} → ${OUTPUT_TOPIC} ` +
            `| Gemini: ${GEMINI_API_KEY ? GEMINI_MODEL : "disabled (heuristics only)"}`
        );
    });
})();
