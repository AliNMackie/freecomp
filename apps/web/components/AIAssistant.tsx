"use client";

import React, { useState } from 'react';
import { Sparkles, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AIAssistantProps {
    onSearch?: (query: string) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ onSearch }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const router = useRouter();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        if (onSearch) {
            onSearch(query);
        } else {
            // Default behavior: redirect to competitions page with search query
            router.push(`/competitions?q=${encodeURIComponent(query)}`);
        }
        setLoading(false);
    };

    return (
        <div className={`
      bg-monzo-blue rounded-lg p-5 mb-6 transition-all duration-300
      ${isFocused ? 'shadow-xl shadow-blue-900/10' : 'shadow-md'}
    `}>
            <div className="flex flex-col md:flex-row md:items-center gap-4">

                <div className="flex-shrink-0 flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded text-monzo-teal">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">AI Comp Scout</h3>
                        <p className="text-blue-200 text-xs">Find niche prizes instantly</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex-grow relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-white transition-colors" size={16} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder='Try "Gaming PC under 5000 entries" or "Holidays for families"'
                        className="w-full bg-slate-900/50 border border-blue-800 text-white text-sm rounded-md pl-10 pr-10 py-2.5 focus:outline-none focus:bg-slate-900 focus:border-monzo-teal placeholder-blue-400/50 transition-all"
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-monzo-teal">
                            <Loader2 size={16} className="animate-spin" />
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};
