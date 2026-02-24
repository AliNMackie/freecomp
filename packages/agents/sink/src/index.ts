import http from "http";
import { PubSub, Message } from "@google-cloud/pubsub";
import { Pool, PoolClient } from "pg";
import type { Competition } from "@ukfreecomps/shared";

// ─── Config ──────────────────────────────────────────────────────────────────

const INPUT_TOPIC = process.env.INPUT_TOPIC ?? "validator-final-listings";
const SUBSCRIPTION_NAME =
    process.env.SUBSCRIPTION_NAME ?? "sink-validator-sub";
const DATABASE_URL = process.env.DATABASE_URL ?? "";
const PORT = process.env.PORT ?? "8080";

if (!DATABASE_URL) {
    console.error("[sink] DATABASE_URL is not set. Aborting.");
    process.exit(1);
}

// ─── Postgres pool ────────────────────────────────────────────────────────────

const isCloudSqlSocket = DATABASE_URL.includes("host=/cloudsql");

const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl:
        process.env.NODE_ENV === "production" && !isCloudSqlSocket
            ? { rejectUnauthorized: false }
            : false,
});

// Track whether the pool can reach Postgres (surfaces on /health).
let dbHealthy = false;

pool.on("connect", () => {
    dbHealthy = true;
});
pool.on("error", (err) => {
    console.error("[sink] Pool error:", err.message);
    dbHealthy = false;
});

// ─── Upsert ───────────────────────────────────────────────────────────────────

const UPSERT_SQL = `
  INSERT INTO competitions (
    id,
    source_url,
    source_site,
    title,
    prize_summary,
    prize_value_estimate,
    closes_at,
    is_free,
    has_skill_question,
    entry_time_estimate,
    hype_score,
    curated_summary,
    discovered_at,
    verified_at,
    exemption_type,
    skill_test_required,
    free_route_verified,
    subscription_risk,
    premium_rate_detected
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8, $9, $10, $11, $12, $13, $14,
    $15, $16, $17, $18, $19
  )
  ON CONFLICT (id) DO UPDATE SET
    source_url          = EXCLUDED.source_url,
    source_site         = EXCLUDED.source_site,
    title               = EXCLUDED.title,
    prize_summary       = EXCLUDED.prize_summary,
    prize_value_estimate= EXCLUDED.prize_value_estimate,
    closes_at           = EXCLUDED.closes_at,
    is_free             = EXCLUDED.is_free,
    has_skill_question  = EXCLUDED.has_skill_question,
    entry_time_estimate = EXCLUDED.entry_time_estimate,
    hype_score          = EXCLUDED.hype_score,
    curated_summary     = EXCLUDED.curated_summary,
    discovered_at       = EXCLUDED.discovered_at,
    verified_at         = EXCLUDED.verified_at,
    exemption_type      = EXCLUDED.exemption_type,
    skill_test_required = EXCLUDED.skill_test_required,
    free_route_verified = EXCLUDED.free_route_verified,
    subscription_risk   = EXCLUDED.subscription_risk,
    premium_rate_detected = EXCLUDED.premium_rate_detected
`;

async function upsertCompetition(
    client: PoolClient,
    comp: Competition
): Promise<void> {
    await client.query(UPSERT_SQL, [
        comp.id,
        comp.sourceUrl,
        comp.sourceSite,
        comp.title,
        comp.prizeSummary ?? null,
        comp.prizeValueEstimate ?? null,
        comp.closesAt ?? null,
        comp.isFree,
        comp.hasSkillQuestion,
        comp.entryTimeEstimate,
        comp.hypeScore,
        comp.curatedSummary,
        comp.discoveredAt,
        comp.verifiedAt ?? null,
        comp.exemptionType ?? "unknown",
        comp.skillTestRequired ?? false,
        comp.freeRouteVerified ?? false,
        comp.subscriptionRisk ?? false,
        comp.premiumRateDetected ?? false,
    ]);
}

// ─── Message handler ──────────────────────────────────────────────────────────

/**
 * Returns true if the error is likely transient (worth nacking for retry).
 * Returns false for permanent failures (malformed data etc — just ack to drop).
 */
function isRetriable(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    // Network / connection errors are retriable; constraint violations are not.
    return (
        msg.includes("econnrefused") ||
        msg.includes("timeout") ||
        msg.includes("connection") ||
        msg.includes("enotfound")
    );
}

async function handleMessage(message: Message): Promise<void> {
    let comp: Competition;

    // 1. Parse
    try {
        comp = JSON.parse(message.data.toString()) as Competition;
    } catch (err) {
        console.error(
            `[sink] Failed to parse message id=${message.id}:`,
            (err as Error).message
        );
        message.ack(); // malformed — never retry
        return;
    }

    // 2. Basic guard before hitting the DB
    if (!comp.id || !comp.sourceUrl) {
        console.warn(
            `[sink] Message id=${message.id} missing required Competition fields — dropping.`
        );
        message.ack();
        return;
    }

    // 3. Upsert
    const client = await pool.connect();
    try {
        await upsertCompetition(client, comp);
        dbHealthy = true;
        console.log(
            `[sink] Upserted competition id=${comp.id} ` +
            `hype=${comp.hypeScore} free=${comp.isFree} (${comp.sourceUrl})`
        );
        message.ack();
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[sink] Upsert failed for id=${comp.id}: ${msg}`);

        if (isRetriable(err)) {
            dbHealthy = false;
            message.nack(); // will be redelivered
        } else {
            // Permanent DB error (e.g. schema mismatch) — ack to avoid poison-pill loop.
            console.error(
                `[sink] Permanent error for id=${comp.id} — acking to avoid retry loop.`
            );
            message.ack();
        }
    } finally {
        client.release();
    }
}

// ─── Pub/Sub subscriber ───────────────────────────────────────────────────────

async function startSubscriber(): Promise<void> {
    const pubsub = new PubSub();
    const topic = pubsub.topic(INPUT_TOPIC);
    const subscription = topic.subscription(SUBSCRIPTION_NAME);

    const [exists] = await subscription.exists();
    if (!exists) {
        await subscription.create();
        console.log(`[sink] Created subscription: ${SUBSCRIPTION_NAME}`);
    }

    subscription.on("message", (message: Message) => {
        // Fire-and-forget per message; pub/sub handles redelivery via nack.
        handleMessage(message).catch((err) => {
            console.error("[sink] Unexpected error in handleMessage:", err);
            message.nack();
        });
    });

    subscription.on("error", (err: Error) => {
        console.error("[sink] Subscription error:", err.message);
    });

    console.log(
        `[sink] Listening on subscription: ${SUBSCRIPTION_NAME} (topic: ${INPUT_TOPIC})`
    );
}

// ─── HTTP health endpoint ─────────────────────────────────────────────────────

async function checkDbHealth(): Promise<"connected" | "error"> {
    try {
        const client = await pool.connect();
        await client.query("SELECT 1");
        client.release();
        return "connected";
    } catch {
        return "error";
    }
}

const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
        // Do a live probe rather than relying solely on the cached flag.
        const dbStatus = await checkDbHealth();
        dbHealthy = dbStatus === "connected";

        const statusCode = dbHealthy ? 200 : 503;
        res.writeHead(statusCode, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify({
                status: dbHealthy ? "OK" : "DEGRADED",
                topic: INPUT_TOPIC,
                subscription: SUBSCRIPTION_NAME,
                db: dbStatus,
            })
        );
        return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

(async () => {
    // Warm up — verify DB is reachable before accepting traffic.
    const dbStatus = await checkDbHealth();
    if (dbStatus === "error") {
        console.warn(
            "[sink] Initial DB health check failed — will retry on each message."
        );
    } else {
        console.log("[sink] DB connection verified.");
    }

    await startSubscriber();

    server.listen(Number(PORT), () => {
        console.log(
            `[sink] HTTP server listening on port ${PORT} | topic: ${INPUT_TOPIC}`
        );
    });
})();
