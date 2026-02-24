'use client';

import React from 'react';
import { ShieldCheck, MessageSquareQuote, ChevronRight, Zap, Trophy, Clock, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';
import type { Competition } from '@ukfreecomps/shared';
import * as Popover from '@radix-ui/react-popover';
import { getHoursSince } from '../utils/time';
import { useLocalStorage } from '../hooks/useLocalStorage';

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

const HypeScorePopover: React.FC<{ hypeScore: number; hypeHigh: boolean }> = ({ hypeScore, hypeHigh }) => (
    <Popover.Root>
        <Popover.Trigger asChild>
            <button className="flex items-center gap-1 cursor-pointer hover:bg-slate-100 p-1 -m-1 rounded transition-colors" aria-label="Explain Hype Score">
                <Trophy size={12} className={hypeHigh ? 'text-monzo-coral' : 'text-slate-300'} />
                <span className={`text-sm font-bold tabular-nums ${hypeHigh ? 'text-monzo-coral' : 'text-slate-600'}`}>
                    {hypeScore}
                </span>
            </button>
        </Popover.Trigger>
        <Popover.Portal>
            <Popover.Content
                className="z-50 w-56 bg-white border border-slate-200 shadow-xl rounded-lg p-3 outline-none"
                sideOffset={8}
            >
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1">
                        <Zap size={12} className="text-amber-400" />
                        AI Breakdown
                    </h4>
                    <span className={`font-extrabold ${hypeHigh ? 'text-monzo-coral' : 'text-slate-600'}`}>{hypeScore}/10</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between items-center">
                        <span className="opacity-80">Prize Value:</span>
                        <span className="font-bold text-slate-800">High</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="opacity-80">Effort:</span>
                        <span className="font-bold text-slate-800">&lt; 1 min</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="opacity-80">Brand:</span>
                        <span className="font-bold text-slate-800">Verified</span>
                    </div>
                </div>
                <Popover.Arrow className="fill-white" />
            </Popover.Content>
        </Popover.Portal>
    </Popover.Root>
);

export const CompetitionCard: React.FC<CompetitionCardProps> = ({ comp }) => {
    const closingDateStr = comp.closesAt
        ? new Date(comp.closesAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
        : 'Ongoing';

    const hypeHigh = comp.hypeScore >= 8;
    const checkedTime = getHoursSince(comp.verifiedAt || comp.discoveredAt);
    const [isEntered, setIsEntered] = useLocalStorage(`entered-${comp.id}`, false);

    return (
        <article className={`group relative border-b border-slate-100 last:border-b-0 transition-colors ${isEntered ? 'bg-slate-50/80 opacity-60 grayscale-[30%]' : 'bg-white hover:bg-slate-50/50'}`}>

            {/* --- DESKTOP LAYOUT --- */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 items-center min-h-[88px]">

                {/* COL 1: Placeholder/Checkbox */}
                <div className="col-span-1 flex justify-center flex-col items-center gap-2">
                    <button
                        onClick={() => setIsEntered(!isEntered)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isEntered ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-slate-400 text-transparent hover:bg-slate-50'}`}
                        aria-label="Mark as entered"
                        title="Mark as entered"
                    >
                        <CheckCircle2 size={16} strokeWidth={isEntered ? 2.5 : 2} className={isEntered ? "text-white" : "text-slate-300 opacity-0 group-hover:opacity-100"} />
                    </button>
                    {isEntered && <span className="text-[9px] font-bold text-emerald-600 uppercase">Entered</span>}
                </div>

                {/* COL 2: Prize Info */}
                <div className="col-span-4 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">{comp.sourceSite}</span>
                        {comp.verifiedAt && (
                            <ShieldCheck size={12} className="text-monzo-blue" aria-label="Verified" />
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1">
                            <Clock size={10} /> {checkedTime}
                        </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-monzo-blue transition-colors mb-0.5 max-w-[90%] truncate">
                        {comp.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{comp.prizeSummary}</p>

                    {/* Compliance Badges */}
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {comp.exemptionType === 'free_draw' && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
                                <Scale size={10} /> Free Draw
                            </span>
                        )}
                        {comp.exemptionType === 'prize_competition' && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                                <Scale size={10} /> Prize Comp
                            </span>
                        )}
                        {comp.skillTestRequired && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wide" title="A skill or knowledge question must be answered correctly to win.">
                                <AlertTriangle size={10} /> Skill Q
                            </span>
                        )}
                        {comp.freeRouteVerified && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide" title="A free postal or web route was verified.">
                                ✓ Free Route
                            </span>
                        )}
                    </div>
                </div>

                {/* COL 3: Signals */}
                <div className="col-span-3 flex items-center justify-start gap-4 border-l border-slate-50 pl-4 h-10">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hype</span>
                        <HypeScorePopover hypeScore={comp.hypeScore} hypeHigh={hypeHigh} />
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Effort</span>
                        <EffortBadge level={comp.entryTimeEstimate.includes('30') ? 'Low' : 'Medium'} />
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Closes</span>
                        <time dateTime={comp.closesAt || undefined} className="text-xs font-medium tabular-nums text-slate-600">
                            {closingDateStr}
                        </time>
                    </div>
                </div>

                {/* COL 4: Action */}
                <div className="col-span-2 flex justify-center pl-2">
                    <a
                        href={`/api/go/${comp.id}`}
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
                    <div className="flex flex-col items-center gap-2 flex-shrink-0 mt-1">
                        <button
                            onClick={() => setIsEntered(!isEntered)}
                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isEntered ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-slate-400 text-transparent hover:bg-slate-50'}`}
                            aria-label="Mark as entered"
                        >
                            <CheckCircle2 size={20} strokeWidth={isEntered ? 2.5 : 2} className={isEntered ? "text-white" : "text-slate-300"} />
                        </button>
                    </div>

                    <div className="min-w-0 flex-grow">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">{comp.sourceSite}</span>
                            <div className="flex items-center gap-2">
                                {comp.verifiedAt && <ShieldCheck size={12} className="text-monzo-blue" />}
                                <HypeScorePopover hypeScore={comp.hypeScore} hypeHigh={hypeHigh} />
                            </div>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight mb-1 pr-2 truncate">{comp.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                            <time dateTime={comp.closesAt || undefined} className="tabular-nums">Ends {closingDateStr}</time>
                            <span className="text-slate-300">•</span>
                            <EffortBadge level={comp.entryTimeEstimate.includes('30') ? 'Low' : 'Medium'} />
                            <span className="text-slate-300 hidden sm:inline">•</span>
                            <span className="text-[10px] flex items-center gap-1"><Clock size={10} /> {checkedTime}</span>
                        </div>

                        {/* Mobile Compliance Badges */}
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                            {comp.exemptionType === 'free_draw' && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
                                    <Scale size={10} /> Free Draw
                                </span>
                            )}
                            {comp.exemptionType === 'prize_competition' && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                                    <Scale size={10} /> Prize Comp
                                </span>
                            )}
                            {comp.skillTestRequired && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wide">
                                    <AlertTriangle size={10} /> Skill Q
                                </span>
                            )}
                            {comp.freeRouteVerified && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                                    ✓ Free Route
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <a
                    href={`/api/go/${comp.id}`}
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
        </article>
    );
};
