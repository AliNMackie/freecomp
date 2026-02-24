import Link from "next/link";
import type { Competition } from "@ukfreecomps/shared";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchCompetitions(params: Record<string, string>): Promise<Competition[]> {
    const qs = new URLSearchParams(params).toString();
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    try {
        const res = await fetch(`${base}/api/competitions?${qs}`, {
            next: { revalidate: 60 },
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
    const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return "Closed";
    if (days === 0) return "Closes today!";
    if (days === 1) return "Closes tomorrow";
    if (days <= 7) return `Closes in ${days} days`;
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(iso));
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CompCard({ comp }: { comp: Competition }) {
    const hypeHigh = comp.hypeScore >= 8;
    return (
        <article className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
            <div
                className={`h-1 rounded-t-2xl ${hypeHigh ? "bg-gradient-to-r from-orange-400 to-rose-500" : "bg-gradient-to-r from-sky-400 to-indigo-400"}`}
            />
            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start gap-2">
                    <h3 className="flex-1 text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100 line-clamp-2">
                        {comp.title}
                    </h3>
                    <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${hypeHigh ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}
                    >
                        🔥 {comp.hypeScore}
                    </span>
                </div>

                {comp.curatedSummary && (
                    <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">
                        {comp.curatedSummary}
                    </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs">
                    {comp.isFree && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-700">
                            ✓ Free entry
                        </span>
                    )}
                    {comp.hasSkillQuestion && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-700">
                            ✎ Skill Q
                        </span>
                    )}
                    <span className="ml-auto text-slate-400">{closingLabel(comp.closesAt)}</span>
                </div>

                <a
                    href={comp.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block rounded-xl bg-slate-900 py-2 text-center text-xs font-semibold tracking-wide text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                    Enter competition →
                </a>
            </div>
        </article>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
    searchParams: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function CompetitionsPage({ searchParams }: PageProps) {
    const isFreeParam = searchParams["isFree"];
    const qParam = searchParams["q"];
    const sortParam = (searchParams["sort"] as string | undefined) ?? "closing";
    const limitParam = searchParams["limit"];

    const params: Record<string, string> = { sort: sortParam };
    if (isFreeParam === "true") params["isFree"] = "true";
    if (isFreeParam === "false") params["isFree"] = "false";
    if (typeof limitParam === "string") params["limit"] = limitParam;
    if (typeof qParam === "string") params["q"] = qParam;

    const competitions = await fetchCompetitions(params);

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto max-w-2xl px-4 py-6">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-sm text-slate-400 hover:text-indigo-600">
                            ← Home
                        </Link>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                            {qParam ? `Search: ${qParam}` : "All Competitions"}
                        </h1>
                        {qParam && (
                            <Link href="/competitions" className="text-xs text-indigo-500 hover:text-indigo-600">
                                Clear
                            </Link>
                        )}
                    </div>

                    {/* Filter chips */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {[
                            { label: "Free only", key: "isFree", val: "true" },
                            { label: "Paid too", key: "isFree", val: "false" },
                        ].map(({ label, key, val }) => {
                            const active = isFreeParam === val;
                            const next = new URLSearchParams(params);
                            if (active) next.delete(key);
                            else next.set(key, val);
                            return (
                                <Link
                                    key={label}
                                    href={`/competitions?${next}`}
                                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
                                >
                                    {label}
                                </Link>
                            );
                        })}
                        {[
                            { label: "Closing soon", val: "closing" },
                            { label: "Top hype", val: "hype" },
                        ].map(({ label, val }) => {
                            const active = sortParam === val;
                            const next = new URLSearchParams(params);
                            next.set("sort", val);
                            return (
                                <Link
                                    key={label}
                                    href={`/competitions?${next}`}
                                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-2xl px-4 py-6">
                <p className="mb-4 text-xs text-slate-400">
                    {competitions.length === 0
                        ? "No competitions found"
                        : `${competitions.length} competition${competitions.length === 1 ? "" : "s"}`}
                </p>

                {competitions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center dark:border-slate-700 dark:bg-slate-900/50">
                        <p className="text-sm text-slate-400">
                            We&rsquo;re indexing competitions right now — check back soon.
                        </p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {competitions.map((comp) => (
                            <li key={comp.id}>
                                <CompCard comp={comp} />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </main>
    );
}
