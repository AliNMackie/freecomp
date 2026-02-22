import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { pool } from "@/lib/db";
import ReviewTable from "./ReviewTable";

// ─── Auth ──────────────────────────────────────────────────────────────────────

function isAuthorised(searchParams: Record<string, string>): boolean {
    const adminKey = process.env.ADMIN_REVIEW_KEY;
    if (!adminKey) return false;

    // 1. Query param ?key=…
    if (searchParams["key"] === adminKey) return true;

    // 2. Authorization: Basic base64(:<key>)  or  Bearer <key>
    const headerList = headers();
    const auth = headerList.get("authorization") ?? "";
    if (auth === `Bearer ${adminKey}`) return true;
    // Basic auth: username is ignored, password is the key
    if (auth.startsWith("Basic ")) {
        const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
        const password = decoded.split(":").slice(1).join(":");
        if (password === adminKey) return true;
    }

    return false;
}

// ─── DB row type ───────────────────────────────────────────────────────────────

interface ReviewRow {
    id: string;
    title: string;
    sourceSite: string;
    sourceUrl: string;
    isFree: boolean;
    hasSkillQuestion: boolean;
    entryTimeEstimate: string | null;
    hypeScore: number;
    closesAt: string | null;
    manualVerified: boolean;
    flagged: boolean;
    flagReason: string | null;
}

async function fetchPendingReview(): Promise<ReviewRow[]> {
    const { rows } = await pool.query<{
        id: string;
        title: string;
        source_site: string;
        source_url: string;
        is_free: boolean;
        has_skill_question: boolean;
        entry_time_estimate: string | null;
        hype_score: string;
        closes_at: Date | null;
        manual_verified: boolean;
        flagged: boolean;
        flag_reason: string | null;
    }>(
        `SELECT
       id, title, source_site, source_url,
       is_free, has_skill_question, entry_time_estimate,
       hype_score, closes_at,
       manual_verified, flagged, flag_reason
     FROM competitions
     WHERE is_free = TRUE
       AND hype_score >= 7
       AND verified_at IS NOT NULL
     ORDER BY verified_at DESC
     LIMIT 50`
    );

    return rows.map((r) => ({
        id: r.id,
        title: r.title,
        sourceSite: r.source_site,
        sourceUrl: r.source_url,
        isFree: r.is_free,
        hasSkillQuestion: r.has_skill_question,
        entryTimeEstimate: r.entry_time_estimate,
        hypeScore: parseFloat(r.hype_score),
        closesAt: r.closes_at ? r.closes_at.toISOString() : null,
        manualVerified: r.manual_verified,
        flagged: r.flagged,
        flagReason: r.flag_reason,
    }));
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
    searchParams: Record<string, string>;
}

export const dynamic = "force-dynamic"; // never cache — always fresh data

export default async function AdminReviewPage({ searchParams }: PageProps) {
    if (!isAuthorised(searchParams)) {
        // Return a 401-equivalent — notFound() gives 404 which is also fine for
        // security-through-obscurity, but we prefer an explicit rejection.
        return (
            <html>
                <body
                    style={{
                        fontFamily: "system-ui, sans-serif",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100vh",
                        margin: 0,
                        background: "#0f172a",
                        color: "#f1f5f9",
                    }}
                >
                    <div style={{ textAlign: "center" }}>
                        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>401</h1>
                        <p style={{ color: "#94a3b8" }}>
                            Provide a valid <code>?key=</code> or Authorization header.
                        </p>
                    </div>
                </body>
            </html>
        );
    }

    let rows: ReviewRow[] = [];
    let dbError = false;
    try {
        rows = await fetchPendingReview();
    } catch (err) {
        console.error("[admin/review] DB error:", err);
        dbError = true;
    }

    const adminKey = searchParams["key"] ?? "";

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Admin Review — UKFreeComps</title>
            </head>
            <body
                style={{
                    fontFamily: "system-ui, sans-serif",
                    margin: 0,
                    padding: "1.5rem",
                    background: "#f1f5f9",
                    minHeight: "100vh",
                }}
            >
                <header
                    style={{
                        marginBottom: "1.5rem",
                        display: "flex",
                        alignItems: "baseline",
                        gap: "1rem",
                    }}
                >
                    <h1
                        style={{
                            fontSize: "1.25rem",
                            fontWeight: 700,
                            color: "#0f172a",
                            margin: 0,
                        }}
                    >
                        🔍 Admin Review Queue
                    </h1>
                    <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                        is_free=true · hype≥7 · verified · 50 most recent
                    </span>
                </header>

                {dbError ? (
                    <div
                        style={{
                            background: "#fef2f2",
                            border: "1px solid #fca5a5",
                            borderRadius: 6,
                            padding: "1rem",
                            color: "#dc2626",
                        }}
                    >
                        ⚠️ Database error — could not load competitions.
                    </div>
                ) : (
                    <ReviewTable rows={rows} adminKey={adminKey} />
                )}
            </body>
        </html>
    );
}
