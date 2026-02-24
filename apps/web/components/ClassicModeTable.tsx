"use client";

import React from 'react';
import type { Competition } from '@ukfreecomps/shared';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getHoursSince } from '../utils/time';
import { Trophy } from 'lucide-react';
import { AdUnit } from './AdUnit';

interface ClassicTableProps {
    competitions: Competition[];
}

const TableRow: React.FC<{ comp: Competition }> = ({ comp }) => {
    const [isEntered, setIsEntered] = useLocalStorage(`entered-${comp.id}`, false);
    const closingDateStr = comp.closesAt
        ? new Date(comp.closesAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
        : 'Ongoing';

    return (
        <tr className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${isEntered ? 'opacity-60 bg-slate-50' : ''}`}>
            {/* Mark as Entered */}
            <td className="p-3 w-12 text-center pointer-events-auto">
                <input
                    type="checkbox"
                    checked={isEntered}
                    onChange={() => setIsEntered(!isEntered)}
                    className="w-4 h-4 cursor-pointer accent-monzo-blue rounded focus:ring-monzo-blue"
                    title="Mark as entered"
                />
            </td>

            {/* Site / Brand */}
            <td className="p-3 text-sm font-semibold text-monzo-blue uppercase tracking-wider">
                {comp.sourceSite}
            </td>

            {/* Title / Prize */}
            <td className="p-3 min-w-[300px]">
                <a href={`/api/go/${comp.id}`} target="_blank" rel="noopener noreferrer sponsored" className="text-sm font-bold text-slate-900 hover:underline decoration-monzo-blue underline-offset-2">
                    {comp.title}
                </a>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{comp.prizeSummary}</p>
            </td>

            {/* Effort */}
            <td className="p-3 text-xs text-slate-600 font-medium">
                {comp.entryTimeEstimate}
            </td>

            {/* Closes */}
            <td className="p-3 text-xs font-bold text-slate-700 tabular-nums w-24">
                {closingDateStr}
            </td>

            {/* Action */}
            <td className="p-3 text-right">
                <a
                    href={`/api/go/${comp.id}`}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className={`inline-block text-xs font-bold py-1.5 px-3 rounded shadow-sm transition-colors ${isEntered ? 'bg-slate-200 text-slate-500' : 'bg-monzo-blue text-white hover:bg-slate-800'}`}
                >
                    {isEntered ? 'Entered' : 'Enter'}
                </a>
            </td>
        </tr>
    );
};

export const ClassicModeTable: React.FC<ClassicTableProps> = ({ competitions }) => {
    if (competitions.length === 0) {
        return (
            <div className="text-center py-12 px-4 bg-white border border-slate-200 rounded-sm">
                <p className="text-sm text-slate-500">No competitions found.</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto bg-white border border-slate-200 shadow-sm sm:rounded-sm">
            <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-200 text-xs text-slate-500 uppercase tracking-widest font-bold">
                        <th className="p-3 w-12 text-center" title="Mark as entered">✓</th>
                        <th className="p-3">Site</th>
                        <th className="p-3 w-2/5">Prize Title</th>
                        <th className="p-3">Effort</th>
                        <th className="p-3">Closes</th>
                        <th className="p-3 text-right">Link</th>
                    </tr>
                </thead>
                <tbody>
                    {competitions.map((comp, index) => (
                        <React.Fragment key={comp.id}>
                            <TableRow comp={comp} />
                            {/* Inject an AdUnit after every 10th row */}
                            {(index + 1) % 10 === 0 && (
                                <tr>
                                    <td colSpan={6} className="bg-slate-50/50 py-4 border-b border-slate-200">
                                        <div className="flex justify-center">
                                            <AdUnit width={728} height={90} className="hidden md:flex bg-white" />
                                            <AdUnit width={320} height={50} className="flex md:hidden bg-white" />
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
