import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pool } from '@/lib/db';
import { CompetitionCard } from '@/components/CompetitionCard';

interface Props {
    params: Promise<{ id: string }> | { id: string };
}

// Map db row to comp obj so we can reuse CompetitionCard
function rowToCompetition(row: any) {
    return {
        id: row.id,
        sourceUrl: row.source_url,
        sourceSite: row.source_site,
        title: row.title,
        prizeSummary: row.prize_summary,
        prizeValueEstimate: row.prize_value_estimate ? parseFloat(row.prize_value_estimate) : null,
        closesAt: row.closes_at ? new Date(row.closes_at).toISOString() : null,
        isFree: row.is_free,
        hasSkillQuestion: row.has_skill_question,
        entryTimeEstimate: row.entry_time_estimate ?? "unknown",
        hypeScore: parseFloat(row.hype_score),
        curatedSummary: row.curated_summary,
        discoveredAt: new Date(row.discovered_at).toISOString(),
        verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
        exemptionType: row.exemption_type,
        skillTestRequired: row.skill_test_required,
        freeRouteVerified: row.free_route_verified,
        subscriptionRisk: row.subscription_risk,
        premiumRateDetected: row.premium_rate_detected,
        brandLogoUrl: row.brand_logo_url,
        clickCount: row.click_count,
    };
}

async function getCompetition(id: string) {
    try {
        const result = await pool.query('SELECT * FROM competitions WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        return result.rows[0];
    } catch (e) {
        // ID not a valid UUID format
        return null;
    }
}

export async function generateMetadata(
    context: Props
): Promise<Metadata> {
    const params = await Promise.resolve(context.params);
    const id = params.id;

    const comp = await getCompetition(id);

    if (!comp) {
        return {
            title: 'Competition Not Found | UKFreeComps',
        };
    }

    // Fallback to title if prize summary isn't fully filled yet
    const prize = comp.prize_summary || comp.title;
    const brand = comp.source_site;
    const maxTitleLength = 50; // Keep space for suffix

    // Truncate prize if it's super long so the title is clean
    const shortPrize = prize.length > maxTitleLength ? prize.substring(0, maxTitleLength) + '...' : prize;
    const title = `Win ${shortPrize} from ${brand} - Free Entry | UKFreeComps`;

    const closesAtFormatted = comp.closes_at
        ? new Date(comp.closes_at).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'Ongoing';

    const description = `Enter to win ${prize} from ${brand}. Closes: ${closesAtFormatted}. Estimated effort: ${comp.entry_time_estimate || 'Quick'}. Verified free entry safely sourced by UKFreeComps.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            siteName: 'UKFreeComps',
        },
        twitter: {
            card: 'summary',
            title,
            description,
        }
    };
}

export default async function CompetitionPage(context: Props) {
    const params = await Promise.resolve(context.params);
    const id = params.id;
    const row = await getCompetition(id);

    if (!row) {
        notFound();
    }

    const comp = rowToCompetition(row);

    return (
        <div className="max-w-4xl mx-auto px-4 py-16 flex-grow w-full">
            <h1 className="text-2xl font-bold mb-8 text-slate-900">Competition Details</h1>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-12">
                {/* We can reuse the CompetitionCard to display the single entry beautifully */}
                <CompetitionCard comp={comp} />
            </div>

            <div className="text-center">
                <a href="/" className="inline-block px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded transition-colors">
                    &larr; Back to all competitions
                </a>
            </div>
        </div>
    );
}
