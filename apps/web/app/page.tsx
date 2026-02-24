import Link from "next/link";
import { Zap, ArrowUpDown, Coins, Sparkles, Clock, LayoutGrid, List } from 'lucide-react';
import type { Competition } from "@ukfreecomps/shared";
import { HeroSection } from "@/components/HeroSection";
import { AIAssistant } from "@/components/AIAssistant";
import { CompetitionCard } from "@/components/CompetitionCard";
import { FeaturedSection } from "@/components/FeaturedSection";
import { ClassicModeTable } from "@/components/ClassicModeTable";
import { FeedList } from "@/components/FeedList";
import { Footer } from "@/components/Footer";
import { EmailCapture } from "@/components/EmailCapture";

import { pool } from "@/lib/db";

// ─── Data fetching (Direct DB Access) ──────────────────────────────────────────

interface CompetitionRow {
    id: string;
    source_url: string;
    source_site: string;
    title: string;
    prize_summary: string | null;
    prize_value_estimate: string | null;
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
        prizeValueEstimate: row.prize_value_estimate ? parseFloat(row.prize_value_estimate) : null,
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

async function getCompetitions(params: { limit: number; sort: "hype" | "closing" }): Promise<Competition[]> {
    const orderBy = params.sort === "hype"
        ? "ORDER BY hype_score DESC"
        : "ORDER BY closes_at NULLS LAST, hype_score DESC";

    try {
        const result = await pool.query<CompetitionRow>(`
            SELECT * FROM competitions 
            WHERE is_free = TRUE 
            ${orderBy} 
            LIMIT $1
        `, [params.limit]);
        return result.rows.map(rowToCompetition);
    } catch (err) {
        console.error("[HomePage] DB error:", err);
        return [];
    }
}

// ─── Quick Filter Pill ────────────────────────────────────────────────────────

function QuickFilterPill({ label, icon, href }: { label: string; icon: React.ReactNode; href: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border bg-white text-slate-600 border-slate-200 hover:border-monzo-blue hover:text-monzo-blue whitespace-nowrap"
        >
            {icon}
            {label}
        </Link>
    );
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
    // Fetch sections in parallel.
    const [allComps, featured] = await Promise.all([
        getCompetitions({ sort: "hype", limit: 20 }),
        getCompetitions({ sort: "hype", limit: 2 }), // Top 2 for featured
    ]);

    // Generate JSON-LD for SGO (Search Generative Optimization)
    // This helps AI search engines index the list as a high-fidelity catalog.
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Latest Free UK Competitions",
        "description": "A curated list of genuinely free UK prize draws.",
        "itemListElement": allComps.map((comp, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
                "@type": "Offer", // Using Offer as it's a promotion
                "name": comp.title,
                "description": comp.prizeSummary,
                "url": comp.sourceUrl,
                "offeredBy": {
                    "@type": "Organization",
                    "name": comp.sourceSite
                },
                "availability": "https://schema.org/InStock",
                "price": "0",
                "priceCurrency": "GBP"
            }
        }))
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 flex flex-col">
            {/* Structured Data for engines & GenAI */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Header */}
            <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-7 h-7 bg-monzo-blue rounded flex items-center justify-center text-white group-hover:bg-slate-800 transition-colors">
                                <Zap size={16} strokeWidth={2.5} />
                            </div>
                            <h1 className="text-lg font-bold tracking-tight text-monzo-blue">
                                UKFreeComps
                            </h1>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <nav className="hidden md:flex items-center text-xs font-bold text-slate-500 gap-6">
                            <Link href="/about" className="hover:text-monzo-blue transition-colors">About</Link>
                            <Link href="/safety" className="hover:text-monzo-blue transition-colors">Safety</Link>
                        </nav>
                        <button className="bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold px-3 py-1.5 rounded transition-colors">
                            Log In
                        </button>
                    </div>
                </div>
            </header>

            <HeroSection />

            <main className="max-w-4xl mx-auto px-4 py-8 flex-grow w-full">
                <AIAssistant />

                {featured.length > 0 && (
                    <FeaturedSection competitions={featured} />
                )}

                {/* Newsletter Signup Banner */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 mb-8 text-center shadow-sm">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Never miss a genuinely free prize draw</h2>
                    <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">Get the best UK competitions delivered straight to your inbox. No spam. No scams.</p>
                    <EmailCapture />
                </div>

                {/* List Control Header */}
                <div className="flex flex-col gap-3 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Browse Today’s Free Prizes
                            <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {allComps.length} active
                            </span>
                        </h2>

                        <button className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-monzo-blue self-start sm:self-auto">
                            Sort: Hype Score
                            <ArrowUpDown size={12} />
                        </button>
                    </div>

                    {/* Quick Filters Pill Row */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <QuickFilterPill
                            label="Cash Prizes"
                            icon={<Coins size={12} className="text-emerald-500" />}
                            href="/competitions?q=cash"
                        />
                        <QuickFilterPill
                            label="Gaming"
                            icon={<Sparkles size={12} className="text-indigo-500" />}
                            href="/competitions?q=gaming"
                        />
                        <QuickFilterPill
                            label="Ending Soon"
                            icon={<Clock size={12} className="text-rose-500" />}
                            href="/competitions?sort=closing"
                        />
                    </div>
                </div>

                {/* High Density List wrapper using client comp */}
                <FeedList competitions={allComps} />
            </main>

            {/* Footer Area */}
            <Footer />
        </div>
    );
}

