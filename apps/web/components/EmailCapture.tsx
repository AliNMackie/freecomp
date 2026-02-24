"use client";

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const EmailCapture = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setStatus('error');
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.status === 201) {
                setStatus('success');
                setEmail('');
            } else {
                throw new Error(data.error || 'Failed to subscribe');
            }
        } catch (err: any) {
            console.error('Subscription error:', err);
            setStatus('error');
            setErrorMessage(err.message || 'An unexpected error occurred. Please try again later.');
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {status === 'success' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-center mb-3">
                        <CheckCircle2 size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="text-emerald-800 font-bold text-lg mb-1">You're on the list!</h3>
                    <p className="text-emerald-600 text-sm">Keep an eye on your inbox for the best free UK competitions.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div className="relative">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (status === 'error') setStatus('idle');
                            }}
                            placeholder="Enter your email address"
                            className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-monzo-blue outline-none transition-all ${status === 'error'
                                    ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-200'
                                    : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-monzo-blue'
                                }`}
                            disabled={status === 'loading'}
                            required
                        />
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-monzo-blue hover:bg-slate-800 text-white font-bold text-sm rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            aria-label="Subscribe to newsletter"
                        >
                            {status === 'loading' ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <>
                                    <span className="hidden sm:inline">Subscribe</span>
                                    <Send size={14} className="sm:hidden" />
                                </>
                            )}
                        </button>
                    </div>

                    {status === 'error' && (
                        <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold animate-in fade-in zoom-in-95">
                            <AlertCircle size={14} />
                            {errorMessage}
                        </div>
                    )}

                    <p className="text-slate-400 text-[10px] text-center px-4 leading-relaxed">
                        By subscribing, you agree to our <a href="/terms" className="underline hover:text-slate-600">Terms</a> and <a href="/privacy" className="underline hover:text-slate-600">Privacy Policy</a>. We respect your privacy. Unsubscribe at any time.
                    </p>
                </form>
            )}
        </div>
    );
};
