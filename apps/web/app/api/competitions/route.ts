import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { Competition } from "@ukfreecomps/shared";

// Row shape as returned by Postgres (snake_case).
interface CompetitionRow {
    id: string;
    source_url: string;
    source_site: string;
    title: string;
    prize_summary: string | null;
    prize_value_estimate: string | null; // NUMERIC comes back as string from pg
    closes_at: Date | null;
    is_free: boolean;
    has_skill_question: boolean;
    entry_time_estimate: string | null;
    hype_score: string;
    curated_summary: string;
    discovered_at: Date;
    verified_at: Date | null;
    exemption_type: "free_draw" | "prize_competition" | "unknown";
    skill_test_required: boolean;
    free_route_verified: boolean;
    subscription_risk: boolean;
    premium_rate_detected: boolean;
    brand_logo_url: string | null;
    click_count: number;
}

function rowToCompetition(row: CompetitionRow): Competition {
    return {
        id: row.id,
        sourceUrl: row.source_url,
        sourceSite: row.source_site,
        title: row.title,
        prizeSummary: row.prize_summary,
        prizeValueEstimate: row.prize_value_estimate
            ? parseFloat(row.prize_value_estimate)
            : null,
        closesAt: row.closes_at ? row.closes_at.toISOString() : null,
        isFree: row.is_free,
        hasSkillQuestion: row.has_skill_question,
        entryTimeEstimate: row.entry_time_estimate ?? "unknown",
        hypeScore: parseFloat(row.hype_score),
        curatedSummary: row.curated_summary,
        discoveredAt: row.discovered_at.toISOString(),
        verifiedAt: row.verified_at ? row.verified_at.toISOString() : null,
        exemptionType: row.exemption_type,
        skillTestRequired: row.skill_test_required,
        freeRouteVerified: row.free_route_verified,
        subscriptionRisk: row.subscription_risk,
        premiumRateDetected: row.premium_rate_detected,
        brandLogoUrl: row.brand_logo_url,
        clickCount: row.click_count,
    };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(request.url);
    const isFreeParam = searchParams.get("isFree");
    const q = searchParams.get("q");
    const sort = searchParams.get("sort"); // "closing" (default) | "hype"
    const limitRaw = parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 100);

    // Build query dynamically but safely (no user-supplied strings in SQL).
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (isFreeParam === "true") {
        conditions.push(`is_free = $${values.length + 1}`);
        values.push(true);
    } else if (isFreeParam === "false") {
        conditions.push(`is_free = $${values.length + 1}`);
        values.push(false);
    }

    if (q) {
        conditions.push(`(title ILIKE $${values.length + 1} OR prize_summary ILIKE $${values.length + 1} OR curated_summary ILIKE $${values.length + 1})`);
        values.push(`%${q}%`);
    }

    const where =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Default: closes_at NULLS LAST so open-ended comps appear last,
    // with hype_score DESC as the tiebreaker within the same closing date.
    const orderBy =
        sort === "hype"
            ? "ORDER BY hype_score DESC"
            : "ORDER BY closes_at NULLS LAST, hype_score DESC";

    const sql = `
    SELECT *
    FROM competitions
    ${where}
    ${orderBy}
    LIMIT ${limit}
  `;

    try {
        const result = await pool.query<CompetitionRow>(sql, values);
        const competitions = result.rows.map(rowToCompetition);

        return NextResponse.json(competitions, {
            headers: {
                // Allow CDN/ISR to cache the listing for up to 60 s.
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
        });
    } catch (err) {
        console.error("[api/competitions] Database error:", err);
        return NextResponse.json(
            { error: "DB_ERROR" },
            { status: 500 }
        );
    }
}
