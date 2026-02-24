import React from 'react';
import { Trophy, ArrowRight, Zap } from 'lucide-react';
import type { Competition } from '@ukfreecomps/shared';

interface FeaturedSectionProps {
    competitions: Competition[];
}

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({ competitions }) => {
    if (competitions.length === 0) return null;

    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Trophy size={14} className="text-monzo-coral" />
                    Editors' Choice
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {competitions.slice(0, 2).map((comp) => (
                    <a
                        key={comp.id}
                        href={`/api/go/${comp.id}`}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-monzo-blue hover:shadow-lg transition-all duration-300"
                    >
                        <div className="absolute top-3 right-3 z-10">
                            <span className="bg-monzo-blue text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                <Zap size={10} fill="currentColor" className="text-amber-400" />
                                HOT
                            </span>
                        </div>

                        <div className="p-5 flex flex-col h-full">
                            <div className="mb-4">
                                <span className="text-[10px] font-bold text-monzo-blue uppercase tracking-wider block mb-1">
                                    {comp.sourceSite}
                                </span>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-monzo-blue transition-colors">
                                    {comp.title}
                                </h3>
                            </div>

                            <p className="text-sm text-slate-500 mb-6 line-clamp-2 italic">
                                {comp.curatedSummary}
                            </p>

                            <div className="mt-auto flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-lg font-extrabold text-monzo-coral">
                                        {comp.hypeScore}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hype</span>
                                </div>
                                <div className="text-monzo-blue font-bold text-xs flex items-center gap-1">
                                    Enter Now <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </section>
    );
};
