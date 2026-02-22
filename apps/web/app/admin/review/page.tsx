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

    return rows.map((r: any) => ({
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
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-100">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-2">401</h1>
                    <p className="text-slate-400">
                        Provide a valid <code>?key=</code> or Authorization header.
                    </p>
                </div>
            </div>
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
        <div className="min-h-screen bg-slate-100 p-6 font-sans">
            <header className="flex items-baseline gap-4 mb-6">
                <h1 className="text-xl font-bold text-slate-900">
                    🔍 Admin Review Queue
                </h1>
                <span className="text-sm text-slate-500">
                    is_free=true · hype≥7 · verified · 50 most recent
                </span>
            </header>

            {dbError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
                    ⚠️ Database error — could not load competitions.
                </div>
            ) : (
                <ReviewTable rows={rows} adminKey={adminKey} />
            )}
        </div>
    );
}
