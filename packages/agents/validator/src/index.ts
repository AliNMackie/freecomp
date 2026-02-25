import http from "http";
import { PubSub, Message } from "@google-cloud/pubsub";
import type { Competition } from "@ukfreecomps/shared";

// ─── Config ──────────────────────────────────────────────────────────────────

const INPUT_TOPIC = process.env.INPUT_TOPIC ?? "converter-validated-listings";
const OUTPUT_TOPIC = process.env.OUTPUT_TOPIC ?? "validator-final-listings";
const SUBSCRIPTION_NAME =
    process.env.SUBSCRIPTION_NAME ?? "validator-converter-sub";
const PORT = process.env.PORT ?? "8080";

// Gemini config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 15_000;
const HTML_EXCERPT_CHARS = 4_000;

// ─── Pub/Sub setup ────────────────────────────────────────────────────────────

const pubsub = new PubSub();
const outputTopic = pubsub.topic(OUTPUT_TOPIC);

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchemaValidationResult {
    valid: boolean;
    errors: string[];
}

/** Shape the Gemini prompt is instructed to return. */
interface LlmEnrichment {
    live: boolean;
    free_entry: boolean;
    has_skill_question: boolean;
    entry_time_estimate: string;
    hype_score_adjustment: number; // clamped −3 … +3
    exemption_type: "free_draw" | "prize_competition" | "unknown";
    free_route_verified: boolean;
    skill_test_required: boolean;
    subscription_risk: boolean;
    premium_rate_detected: boolean;
}

/** Conservative default used when the Gemini call fails. */
const LLM_FALLBACK: LlmEnrichment = {
    live: true, // Be optimistic on failure so we don't drop everything
    free_entry: true,
    has_skill_question: false,
    entry_time_estimate: "1–2 minutes",
    hype_score_adjustment: 0,
    exemption_type: "unknown",
    free_route_verified: false,
    skill_test_required: false,
    subscription_risk: false,
    premium_rate_detected: false,
};

// ─── Gemini prompt ────────────────────────────────────────────────────────────

function buildPrompt(title: string, url: string, htmlExcerpt: string): string {
    return `You are validating online prize competitions for a UK competition listing website.

Your job:
- Decide if the competition is still LIVE.
- Decide if there is a FREE ENTRY route (no payment required to enter).
- Decide if a SKILL QUESTION is required (e.g. quiz question, 'spot the ball', tie-breaker answer).
- Determine UK Gambling Act compliance metrics: exemption_type, free_route_verified, skill_test_required, subscription_risk, and premium_rate_detected.
- Estimate TIME TO ENTER based on how complex the entry is.
- Optionally adjust a hype score.

You MUST respond with VALID JSON ONLY, no extra text, no comments.

JSON schema:
{
  "live": boolean,
  "free_entry": boolean,
  "has_skill_question": boolean,
  "exemption_type": string, // "free_draw" | "prize_competition" | "unknown"
  "free_route_verified": boolean,
  "skill_test_required": boolean,
  "subscription_risk": boolean,
  "premium_rate_detected": boolean,
  "entry_time_estimate": string,   // e.g. "30 seconds", "2–3 minutes"
  "hype_score_adjustment": number  // between -3 and 3
}

Guidelines:
- live: false if the page clearly says closed/ended or has a past closing date.
- free_entry: true only if the main way to enter does NOT require payment (ignore optional extra-pay entries).
- has_skill_question: true if there is any question that requires knowledge/creativity beyond just filling a form.
- exemption_type: "free_draw" if entry is purely chance with no payment or via a free route (e.g., postal). "prize_competition" if a significant skill test prevents a large proportion of people from entering or winning. "unknown" if unclear.
- free_route_verified: true if a free entry route (like postal or free web entry) is explicitly mentioned and verified in the text.
- skill_test_required: true if a non-trivial skill, judgment, or knowledge test is required.
- subscription_risk: true if entry clearly requires signing up to a recurring paid subscription.
- premium_rate_detected: true if the text mentions premium rate phone numbers (e.g. starting with 09) or text messages that cost significant money.
- entry_time_estimate:
  - "30–60 seconds" if it's just name/email/postcode.
  - "2–3 minutes" if social follows, shares, or multiple steps.
  - "5+ minutes" if long forms, uploads, essays, or multiple tasks.
  - hype_score_adjustment:
  - +2 to +3 for very high-value prizes (cars, flagship phones, big holidays).
  - +1 for attractive mid-range prizes.
  - 0 for average.
  - -1 to -3 for low-value or spammy/unclear prizes.

Now analyse this competition:

TITLE:
${title}

URL:
${url}

HTML_SNIPPET (may be truncated):
${htmlExcerpt.slice(0, HTML_EXCERPT_CHARS)}

Return ONLY JSON, exactly matching the schema above.`;
}

// ─── Gemini HTTP call ─────────────────────────────────────────────────────────

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
}

interface GeminiInput {
    title: string;
    url: string;
    html_excerpt: string;
}

/**
 * Call the Gemini generateContent REST API.
 *
 * Accepts a typed GeminiInput, builds the prompt internally, and returns
 * the raw text from the first candidate part.
 * Logs request timing and throws on errors for the caller to handle.
 */
async function callGeminiValidation(input: GeminiInput): Promise<string> {
    const prompt = buildPrompt(input.title, input.url, input.html_excerpt);

    const modelName = GEMINI_MODEL.startsWith("models/") ? GEMINI_MODEL : `models/${GEMINI_MODEL}`;
    const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const body = JSON.stringify({
        contents: [
            {
                role: "user",
                parts: [{ text: prompt }],
            },
        ],
        generationConfig: {
            responseMimeType: "application/json", // discourage markdown wrapping
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
            throw new Error(
                `Gemini API HTTP ${res.status} (${elapsedMs}ms): ${errText.slice(0, 200)}`
            );
        }

        const json = (await res.json()) as GeminiResponse;
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

        if (typeof text !== "string" || !text.trim()) {
            throw new Error(`Gemini response had no text content (${elapsedMs}ms)`);
        }

        console.log(
            `[validator] Gemini responded in ${elapsedMs}ms ` +
            `(${text.length} chars, model: ${GEMINI_MODEL})`
        );

        return text.trim();
    } finally {
        clearTimeout(timer);
    }
}

// ─── LLM enrichment ──────────────────────────────────────────────────────────

function clamp(min: number, max: number, value: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Hard-validate and normalise the raw object parsed from Gemini's text.
 * All fields are coerced defensively so a partially-correct response is
 * still usable rather than falling back entirely.
 */
function normaliseLlmResponse(raw: unknown): LlmEnrichment {
    if (typeof raw !== "object" || raw === null) {
        throw new Error("Gemini output is not a JSON object");
    }

    const r = raw as Record<string, unknown>;

    let exemptionType: "free_draw" | "prize_competition" | "unknown" = "unknown";
    if (r.exemption_type === "free_draw" || r.exemption_type === "prize_competition") {
        exemptionType = r.exemption_type as "free_draw" | "prize_competition";
    }

    return {
        live: !!r.live,
        free_entry: !!r.free_entry,
        has_skill_question: !!r.has_skill_question,
        exemption_type: exemptionType,
        free_route_verified: !!r.free_route_verified,
        skill_test_required: !!r.skill_test_required,
        subscription_risk: !!r.subscription_risk,
        premium_rate_detected: !!r.premium_rate_detected,
        entry_time_estimate:
            typeof r.entry_time_estimate === "string" && r.entry_time_estimate.trim()
                ? r.entry_time_estimate.trim()
                : "unknown",
        hype_score_adjustment: clamp(
            -3,
            3,
            Number.isFinite(Number(r.hype_score_adjustment))
                ? Number(r.hype_score_adjustment)
                : 0
        ),
    };
}

/**
 * Call Gemini to enrich a Competition.
 * Returns LlmEnrichment or LLM_FALLBACK on any failure.
 */
async function validateWithGemini(
    comp: Competition,
    htmlExcerpt: string
): Promise<LlmEnrichment> {
    if (!GEMINI_API_KEY) {
        console.warn(
            "[validator] GEMINI_API_KEY not set — skipping Gemini enrichment."
        );
        return LLM_FALLBACK;
    }

    try {
        const rawText = await callGeminiValidation({
            title: comp.title,
            url: comp.sourceUrl,
            html_excerpt: htmlExcerpt,
        });

        let parsed: unknown;
        try {
            parsed = JSON.parse(rawText);
        } catch {
            // Gemini sometimes wraps JSON in a markdown fence — strip it
            const fenceMatch = /```(?:json)?\s*([\s\S]+?)```/i.exec(rawText);
            if (fenceMatch) {
                parsed = JSON.parse(fenceMatch[1]);
            } else {
                throw new Error(
                    `Gemini output is not valid JSON: ${rawText.slice(0, 200)}`
                );
            }
        }

        const enrichment = normaliseLlmResponse(parsed);
        console.log(
            `[validator] Gemini enrichment for id=${comp.id}: ` +
            `live=${enrichment.live} free=${enrichment.free_entry} ` +
            `adj=${enrichment.hype_score_adjustment}`
        );
        return enrichment;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
            `[validator] Gemini call failed for id=${comp.id}: ${msg}. Using fallback.`
        );
        return LLM_FALLBACK;
    }
}

// ─── Schema validation ────────────────────────────────────────────────────────

function validateSchema(comp: Competition): SchemaValidationResult {
    const errors: string[] = [];

    if (!comp.id?.trim()) errors.push("id is missing or empty");
    if (!comp.sourceUrl?.trim()) errors.push("sourceUrl is missing or empty");
    if (!comp.sourceSite?.trim()) errors.push("sourceSite is missing or empty");
    if (!comp.title?.trim()) errors.push("title is missing or empty");
    if (!comp.discoveredAt?.trim()) errors.push("discoveredAt is missing or empty");

    if (comp.sourceUrl) {
        try {
            new URL(comp.sourceUrl);
        } catch {
            errors.push(`sourceUrl is not a valid URL: "${comp.sourceUrl}"`);
        }
    }

    if (comp.discoveredAt && isNaN(Date.parse(comp.discoveredAt)))
        errors.push(`discoveredAt is not a valid ISO datetime: "${comp.discoveredAt}"`);
    if (comp.closesAt !== null && isNaN(Date.parse(comp.closesAt)))
        errors.push(`closesAt is not a valid ISO datetime: "${comp.closesAt}"`);
    if (comp.verifiedAt !== null && isNaN(Date.parse(comp.verifiedAt)))
        errors.push(`verifiedAt is not a valid ISO datetime: "${comp.verifiedAt}"`);
    if (comp.hypeScore < 1 || comp.hypeScore > 10 || !Number.isFinite(comp.hypeScore))
        errors.push(`hypeScore must be 1–10, got: ${comp.hypeScore}`);
    if (comp.prizeValueEstimate !== null && comp.prizeValueEstimate < 0)
        errors.push(`prizeValueEstimate must be >= 0, got: ${comp.prizeValueEstimate}`);

    return { valid: errors.length === 0, errors };
}

// ─── Core processing ──────────────────────────────────────────────────────────

async function processCompetition(
    comp: Competition,
    htmlExcerpt: string = ""
): Promise<Competition> {
    // 1. Schema check
    const schemaResult = validateSchema(comp);
    if (!schemaResult.valid) {
        const summary = schemaResult.errors.join("; ");
        console.warn(`[validator] Schema rejected id=${comp.id}: ${summary}`);
        throw new Error(`Validation failed: ${summary}`);
    }

    // 2. Gemini enrichment
    const enrichment = await validateWithGemini(comp, htmlExcerpt);

    // 3. Reject listings Gemini deems not live
    if (!enrichment.live) {
        console.warn(`[validator] Gemini marked id=${comp.id} as not live — dropping.`);
        throw new Error("Validation failed: Gemini determined competition is not live");
    }

    // 4. Apply enrichments
    const newHype = clamp(1, 10, comp.hypeScore + enrichment.hype_score_adjustment);

    const approved: Competition = {
        ...comp,
        isFree: enrichment.free_entry,
        hasSkillQuestion: enrichment.has_skill_question,
        entryTimeEstimate: enrichment.entry_time_estimate,
        hypeScore: newHype,
        verifiedAt: new Date().toISOString(),
        exemptionType: enrichment.exemption_type,
        freeRouteVerified: enrichment.free_route_verified,
        skillTestRequired: enrichment.skill_test_required,
        subscriptionRisk: enrichment.subscription_risk,
        premiumRateDetected: enrichment.premium_rate_detected,
    };

    // 5. Publish
    const buffer = Buffer.from(JSON.stringify(approved));
    await outputTopic.publish(buffer);

    console.log(
        `[validator] Approved id=${approved.id} ` +
        `hype=${comp.hypeScore}→${newHype} ` +
        `free=${approved.isFree} (${approved.sourceUrl}) → ${OUTPUT_TOPIC}`
    );

    return approved;
}

// ─── Pub/Sub subscriber ───────────────────────────────────────────────────────

async function startSubscriber(): Promise<void> {
    const topic = pubsub.topic(INPUT_TOPIC);
    const subscription = topic.subscription(SUBSCRIPTION_NAME);

    const [exists] = await subscription.exists();
    if (!exists) {
        await subscription.create();
        console.log(`[validator] Created subscription: ${SUBSCRIPTION_NAME}`);
    }

    subscription.on("message", async (message: Message) => {
        let comp: Competition;
        try {
            comp = JSON.parse(message.data.toString()) as Competition;
        } catch (err) {
            console.error("[validator] Failed to parse message:", err);
            message.ack();
            return;
        }

        try {
            await processCompetition(comp, "");
            message.ack();
        } catch (err) {
            const isValidationError =
                err instanceof Error && err.message.startsWith("Validation failed");
            if (isValidationError) {
                message.ack(); // permanent — never retry
            } else {
                console.error("[validator] Retriable error:", err);
                message.nack();
            }
        }
    });

    subscription.on("error", (err: Error) => {
        console.error("[validator] Subscription error:", err);
    });

    console.log(
        `[validator] Listening on subscription: ${SUBSCRIPTION_NAME} (topic: ${INPUT_TOPIC})`
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

interface TestBody extends Competition {
    html_excerpt?: string;
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
            const parsed = JSON.parse(body) as TestBody;
            const { html_excerpt = "", ...comp } = parsed;
            const approved = await processCompetition(comp as Competition, html_excerpt);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(approved));
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("[validator] /test error:", err);
            const status = message.startsWith("Validation failed") ? 422 : 500;
            res.writeHead(status, { "Content-Type": "application/json" });
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
            `[validator] HTTP server listening on port ${PORT} ` +
            `| ${INPUT_TOPIC} → ${OUTPUT_TOPIC} ` +
            `| Gemini: ${GEMINI_API_KEY ? GEMINI_MODEL : "disabled"}`
        );
    });
})();
