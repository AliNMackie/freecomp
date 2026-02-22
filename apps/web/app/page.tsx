import Link from "next/link";
import type { Competition } from "@ukfreecomps/shared";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchSection(params: Record<string, string>): Promise<Competition[]> {
    const qs = new URLSearchParams(params).toString();
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    try {
        const res = await fetch(`${base}/api/competitions?${qs}`, {
            next: { revalidate: 60 }, // ISR: revalidate every minute
        });
        if (!res.ok) return [];
        return res.json() as Promise<Competition[]>;
    } catch {
        return [];
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function closingLabel(iso: string | null): string {
    if (!iso) return "No closing date";
    const d = new Date(iso);
    const now = new Date();
    const days = Math.round((d.getTime() - now.getTime()) / 86_400_000);
    if (days < 0) return "Closed";
    if (days === 0) return "Closes today!";
    if (days === 1) return "Closes tomorrow";
    if (days <= 7) return `Closes in ${days} days`;
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(d);
}

function urgencyClass(iso: string | null): string {
    if (!iso) return "text-slate-400";
    const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
    if (days <= 1) return "text-red-500 font-semibold";
    if (days <= 7) return "text-orange-500 font-medium";
    return "text-slate-400";
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CompCard({ comp }: { comp: Competition }) {
    const hypeHigh = comp.hypeScore >= 8;
    return (
        <article className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
            {/* Hype accent bar */}
            <div
                className={`h-1 w-full rounded-t-2xl ${hypeHigh ? "bg-gradient-to-r from-orange-400 to-rose-500" : "bg-gradient-to-r from-sky-400 to-indigo-400"}`}
            />

            <div className="flex flex-1 flex-col gap-3 p-4">
                {/* Title + hype chip */}
                <div className="flex items-start gap-2">
                    <h3 className="flex-1 text-[0.95rem] font-semibold leading-snug text-slate-900 dark:text-slate-100 line-clamp-2">
                        {comp.title}
                    </h3>
                    <span
                        title="Hype score"
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${hypeHigh
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                    >
                        🔥 {comp.hypeScore}
                    </span>
                </div>

                {/* Curated summary */}
                {comp.curatedSummary && (
                    <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
                        {comp.curatedSummary}
                    </p>
                )}

                {/* Badges + meta */}
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
                    {comp.isFree && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-700">
                            ✓ Free entry
                        </span>
                    )}
                    {comp.hasSkillQuestion && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-700">
                            ✎ Skill Q
                        </span>
                    )}
                    <span className={`ml-auto text-xs ${urgencyClass(comp.closesAt)}`}>
                        📅 {closingLabel(comp.closesAt)}
                    </span>
                </div>

                {/* CTA */}
                <a
                    href={comp.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="mt-2 block rounded-xl bg-slate-900 py-2 text-center text-xs font-semibold tracking-wide text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                    Enter competition →
                </a>
            </div>
        </article>
    );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
    title,
    emoji,
    comps,
    viewAllHref,
    emptyMessage,
}: {
    title: string;
    emoji: string;
    comps: Competition[];
    viewAllHref: string;
    emptyMessage: string;
}) {
    return (
        <section className="py-8">
            {/* Section header */}
            <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {emoji} {title}
                </h2>
                <Link
                    href={viewAllHref}
                    className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200"
                >
                    View all →
                </Link>
            </div>

            {comps.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
                    <p className="text-sm text-slate-400">{emptyMessage}</p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {comps.map((comp) => (
                        <li key={comp.id}>
                            <CompCard comp={comp} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

// ─── Empty state (both sections empty) ────────────────────────────────────────

function GlobalEmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 text-5xl">⚙️</div>
            <h2 className="mb-2 text-xl font-semibold text-slate-700 dark:text-slate-300">
                We&rsquo;re indexing competitions right now
            </h2>
            <p className="max-w-sm text-sm text-slate-400 dark:text-slate-500">
                Our scout is out hunting the best free-to-enter UK competitions. Check
                back in a few minutes — they&rsquo;ll be here soon.
            </p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export default async function HomePage() {
    // Fetch both sections in parallel.
    const [closing, hype] = await Promise.all([
        fetchSection({ isFree: "true", sort: "closing", limit: "10" }),
        fetchSection({ isFree: "true", sort: "hype", limit: "10" }),
    ]);

    const totalCount = new Set([...closing, ...hype].map((c) => c.id)).size;

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* ── Hero / header ── */}
            <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
                    <div className="mb-3 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-700">
                        🇬🇧 UK competitions only · Free to enter · AI-validated
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                        Win something great —<br />
                        <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                            no cost, no catch
                        </span>
                    </h1>
                    <p className="mt-3 text-base text-slate-500 dark:text-slate-400">
                        Curated free-to-enter UK competitions, scored and summarised by AI
                        so you can enter the best ones first.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                            href="/competitions"
                            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                        >
                            Browse all competitions
                        </Link>
                        <Link
                            href="/competitions?isFree=true&sort=closing"
                            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            Closing soon
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── Body ── */}
            <div className="mx-auto max-w-2xl px-4">
                {totalCount === 0 ? (
                    <GlobalEmptyState />
                ) : (
                    <>
                        <Section
                            emoji="⏰"
                            title="Closing soon — free only"
                            comps={closing}
                            viewAllHref="/competitions?isFree=true&sort=closing"
                            emptyMessage="We're indexing competitions right now — check back soon."
                        />

                        <div className="border-t border-slate-200 dark:border-slate-800" />

                        <Section
                            emoji="🔥"
                            title="High hype picks"
                            comps={hype}
                            viewAllHref="/competitions?isFree=true&sort=hype"
                            emptyMessage="We're indexing competitions right now — check back soon."
                        />
                    </>
                )}

                {/* Footer */}
                <footer className="py-10 text-center text-xs text-slate-400 dark:text-slate-600">
                    UKFreeComps · competitions updated continuously · not affiliated with
                    prize providers
                </footer>
            </div>
        </main>
    );
}
