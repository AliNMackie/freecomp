"use client";

import React from 'react';
import type { Competition } from '@ukfreecomps/shared';
import { CompetitionCard } from './CompetitionCard';
import { ClassicModeTable } from './ClassicModeTable';
import { AdUnit } from './AdUnit';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { LayoutGrid, List } from 'lucide-react';

interface FeedListProps {
    competitions: Competition[];
}

export const FeedList: React.FC<FeedListProps> = ({ competitions }) => {
    const [viewMode, setViewMode] = useLocalStorage<'smart' | 'classic'>('viewMode', 'smart');

    return (
        <div className="flex flex-col gap-4">
            {/* View Toggle */}
            <div className="flex justify-end items-center gap-2 px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">View Layout</span>
                <div className="bg-slate-100 p-1 rounded-lg flex items-center shadow-inner">
                    <button
                        onClick={() => setViewMode('smart')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'smart'
                            ? 'bg-white text-monzo-blue shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                        aria-label="Smart View"
                    >
                        <LayoutGrid size={14} /> Smart
                    </button>
                    <button
                        onClick={() => setViewMode('classic')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'classic'
                            ? 'bg-white text-monzo-blue shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                        aria-label="Classic View"
                    >
                        <List size={14} /> Classic
                    </button>
                </div>
            </div>

            {/* List Render */}
            {viewMode === 'smart' ? (
                <div className="bg-white border sm:border border-slate-200 sm:rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden">
                    {competitions.length > 0 ? (
                        competitions.map((comp, index) => (
                            <React.Fragment key={comp.id}>
                                <CompetitionCard comp={comp} />
                                {/* Inject an AdUnit after every 10th card */}
                                {(index + 1) % 10 === 0 && (
                                    <div className="py-6 border-b border-slate-100 bg-slate-50/30">
                                        <AdUnit width={728} height={90} className="hidden md:flex" />
                                        <AdUnit width={320} height={50} className="flex md:hidden" />
                                    </div>
                                )}
                            </React.Fragment>
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
            ) : (
                <ClassicModeTable competitions={competitions} />
            )}
        </div>
    );
};
