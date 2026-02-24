import { pool } from '@/lib/db';
import { ShieldCheck, TrendingUp, Users, Link as LinkIcon, Activity } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Traffic Analytics | Admin',
    robots: { index: false, follow: false },
};

// Next.js config to force dynamic rendering since this is live data
export const dynamic = 'force-dynamic';

async function getAnalyticsData() {
    // We execute these concurrently for speed
    const [viewsRes, referrersRes, pathsRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '7 days'`),
        pool.query(`SELECT referrer, COUNT(*) as count FROM analytics_events GROUP BY referrer ORDER BY count DESC LIMIT 10`),
        pool.query(`SELECT path, COUNT(*) as count FROM analytics_events GROUP BY path ORDER BY count DESC LIMIT 10`)
    ]);

    return {
        totalViews: parseInt(viewsRes.rows[0].count, 10) || 0,
        topReferrers: referrersRes.rows,
        topPaths: pathsRes.rows,
    };
}

export default function AdminTrafficDashboard() {
    // This is a Server Component, so we can await the data directly without useEffect/useState overhead.
    // It runs securely on the Node server after passing the middleware Auth check.
    return (
        <TrafficView />
    );
}

// We extract the async part slightly to keep the UI clean
async function TrafficView() {
    let data;
    try {
        data = await getAnalyticsData();
    } catch (e) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Database Error</h2>
                    <p className="text-slate-600">Could not fetch analytics data.</p>
                </div>
            </div>
        );
    }

    const { totalViews, topReferrers, topPaths } = data;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-monzo-blue/10 p-2 rounded-lg">
                            <Activity className="text-monzo-blue h-5 w-5" />
                        </div>
                        <h1 className="text-xl font-bold font-serif tracking-tight text-slate-800">Traffic Analytics</h1>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                        <ShieldCheck size={14} />
                        Secure Session
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Core Metric */}
                <section>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between overflow-hidden relative">
                        <div className="relative z-10">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                                <TrendingUp size={16} className="text-monzo-coral" /> Total Page Views
                            </p>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-6xl font-black tracking-tighter text-slate-900">{totalViews.toLocaleString()}</h2>
                                <span className="text-sm font-semibold text-slate-400">Past 7 Days</span>
                            </div>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute -right-8 -top-8 text-slate-50 opacity-50 z-0 pointer-events-none">
                            <Users size={200} strokeWidth={0.5} />
                        </div>
                    </div>
                </section>

                {/* Data Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Top Referrers */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <LinkIcon size={18} className="text-monzo-teal" />
                                Top Referrers
                            </h3>
                            <span className="text-xs font-medium text-slate-400">Sources driving traffic</span>
                        </div>
                        <div className="overflow-x-auto flex-grow">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/30 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
                                        <th className="px-6 py-3 font-semibold">Source URL</th>
                                        <th className="px-6 py-3 font-semibold text-right">Views</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                    {topReferrers.length === 0 ? (
                                        <tr><td colSpan={2} className="px-6 py-8 text-center text-slate-400 italic">No referrers recorded yet.</td></tr>
                                    ) : (
                                        topReferrers.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3 font-medium text-slate-900 max-w-[200px] sm:max-w-xs truncate" title={row.referrer || 'Direct / Bookmark'}>
                                                    {row.referrer || <span className="text-slate-400 italic">Direct / Bookmark</span>}
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold tabular-nums">
                                                    {parseInt(row.count, 10).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Top Pages */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Activity size={18} className="text-monzo-blue" />
                                Most Visited Pages
                            </h3>
                            <span className="text-xs font-medium text-slate-400">Popular content</span>
                        </div>
                        <div className="overflow-x-auto flex-grow">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/30 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
                                        <th className="px-6 py-3 font-semibold">Path</th>
                                        <th className="px-6 py-3 font-semibold text-right">Views</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                    {topPaths.length === 0 ? (
                                        <tr><td colSpan={2} className="px-6 py-8 text-center text-slate-400 italic">No paths recorded yet.</td></tr>
                                    ) : (
                                        topPaths.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3 font-medium text-slate-900 max-w-[200px] sm:max-w-xs truncate" title={row.path}>
                                                    {row.path === '/' ? 'Home (Feed)' : row.path}
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold tabular-nums">
                                                    {parseInt(row.count, 10).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}

// Ensure the AlertTriangle icon is available for the error state
import { AlertTriangle } from 'lucide-react';
