import React from 'react';
import { ShieldCheck, MessageSquareQuote, ChevronRight, Zap, Trophy } from 'lucide-react';
import type { Competition } from '@ukfreecomps/shared';

interface CompetitionCardProps {
    comp: Competition;
}

const EffortBadge: React.FC<{ level: string }> = ({ level }) => {
    const styles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
        Low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: 'text-emerald-500' },
        Medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: 'text-amber-500' },
        High: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: 'text-slate-400' },
    };

    const style = styles[level] || styles.Medium;

    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
            <Zap size={10} className={style.icon} fill="currentColor" />
            {level === 'Low' ? 'Quick' : level}
        </span>
    );
};

export const CompetitionCard: React.FC<CompetitionCardProps> = ({ comp }) => {
    const closingDateStr = comp.closesAt
        ? new Date(comp.closesAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
        : 'Ongoing';

    const hypeHigh = comp.hypeScore >= 8;

    return (
        <div className="group relative bg-white border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">

            {/* --- DESKTOP LAYOUT --- */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 items-center min-h-[88px]">

                {/* COL 1: Placeholder for image if we had one, otherwise just provider info */}
                <div className="col-span-1 flex justify-center">
                    <div className="w-12 h-12 rounded border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center text-slate-300">
                        <Trophy size={20} />
                    </div>
                </div>

                {/* COL 2: Prize Info */}
                <div className="col-span-4 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">{comp.sourceSite}</span>
                        {comp.verifiedAt && (
                            <ShieldCheck size={12} className="text-monzo-blue" aria-label="Verified" />
                        )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-monzo-blue transition-colors mb-0.5 max-w-[90%] truncate">
                        {comp.title}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">{comp.prizeSummary}</p>
                </div>

                {/* COL 3: Signals */}
                <div className="col-span-3 flex items-center justify-start gap-4 border-l border-slate-50 pl-4 h-10">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hype</span>
                        <div className="flex items-center gap-1">
                            <Trophy size={12} className={hypeHigh ? 'text-monzo-coral' : 'text-slate-300'} />
                            <span className={`text-sm font-bold tabular-nums ${hypeHigh ? 'text-monzo-coral' : 'text-slate-600'}`}>
                                {comp.hypeScore}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Effort</span>
                        <EffortBadge level={comp.entryTimeEstimate.includes('30') ? 'Low' : 'Medium'} />
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Closes</span>
                        <span className="text-xs font-medium tabular-nums text-slate-600">
                            {closingDateStr}
                        </span>
                    </div>
                </div>

                {/* COL 4: Action */}
                <div className="col-span-2 flex justify-center pl-2">
                    <a
                        href={comp.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="w-full text-center bg-monzo-blue hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-md shadow-sm transition-all flex items-center justify-center gap-1"
                    >
                        Enter <ChevronRight size={12} className="opacity-60" />
                    </a>
                </div>

                {/* COL 5: Our Take */}
                <div className="col-span-2 pl-4 border-l border-slate-100 -my-3 py-3 h-full flex flex-col justify-center bg-slate-50/50">
                    <div className="flex items-center gap-1 mb-1 opacity-70">
                        <MessageSquareQuote size={10} className="text-monzo-teal" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Our Take</span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-snug font-medium line-clamp-3 italic">
                        {comp.curatedSummary}
                    </p>
                </div>
            </div>

            {/* --- MOBILE LAYOUT --- */}
            <div className="lg:hidden p-4 flex flex-col gap-4">
                <div className="flex gap-4">
                    <div className="w-16 h-16 rounded border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <Trophy size={24} />
                    </div>

                    <div className="min-w-0 flex-grow">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">{comp.sourceSite}</span>
                            <div className="flex items-center gap-2">
                                {comp.verifiedAt && <ShieldCheck size={12} className="text-monzo-blue" />}
                                <span className={`text-[10px] font-bold ${hypeHigh ? 'text-monzo-coral' : 'text-slate-400'}`}>
                                    {comp.hypeScore} Hype
                                </span>
                            </div>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight mb-1 pr-2 truncate">{comp.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5">
                            <span className="tabular-nums">Ends {closingDateStr}</span>
                            <span className="text-slate-300">•</span>
                            <EffortBadge level={comp.entryTimeEstimate.includes('30') ? 'Low' : 'Medium'} />
                        </div>
                    </div>
                </div>

                <a
                    href={comp.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="block w-full text-center bg-monzo-blue active:bg-slate-800 text-white font-bold py-3 rounded-lg text-sm shadow-sm"
                >
                    Enter Competition
                </a>

                <div className="flex gap-3 px-1 pt-1 border-t border-slate-100">
                    <MessageSquareQuote size={16} className="text-monzo-teal flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Our Take</span>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
                            {comp.curatedSummary}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
