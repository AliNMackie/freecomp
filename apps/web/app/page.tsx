import Link from "next/link";
import { Menu, Zap, Coins, Clock, ArrowUpDown, Sparkles } from 'lucide-react';
import type { Competition } from "@ukfreecomps/shared";
import { HeroSection } from "../components/HeroSection";
import { AIAssistant } from "../components/AIAssistant";
import { CompetitionCard } from "../components/CompetitionCard";
import { FeaturedSection } from "../components/FeaturedSection";

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

                {/* High Density List */}
                <div className="bg-white border sm:border border-slate-200 sm:rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden">
                    {allComps.length > 0 ? (
                        allComps.map((comp: Competition) => (
                            <CompetitionCard key={comp.id} comp={comp} />
                        ))
                    ) : (
                        <div className="text-center py-24 px-4">
                            <div className="text-4xl mb-4">⚙️</div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">We're indexing competitions right now</h3>
                            <p className="max-w-sm mx-auto text-sm text-slate-400">
                                Our scout is out hunting the best free UK competitions.
                                Check back in a few minutes — they'll be here soon.
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer Area */}
            <footer className="bg-white border-t border-slate-200 mt-12">
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <div className="text-center text-slate-400 text-[10px] leading-relaxed max-w-lg mx-auto">
                        <p className="mb-2">UKFreeComps is an aggregator. We verify safety but are not responsible for prize fulfillment.</p>
                        <p>Competitions listed are hosted by third parties. Terms and conditions apply. &copy; {new Date().getFullYear()} UKFreeComps.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
