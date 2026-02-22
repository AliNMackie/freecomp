import React from 'react';
import { ArrowDown, CheckCircle2, Mail, Shield, UserCheck, Ban } from 'lucide-react';

export const HeroSection: React.FC = () => {
    return (
        <section className="bg-white border-b border-slate-200">
            <div className="mx-auto max-w-2xl px-4 pt-10 pb-8 sm:pt-14 sm:pb-10 text-center">

                {/* Headline */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-slate-900 tracking-tight mb-5 leading-tight">
                    The UK’s independent <br className="hidden sm:block" />
                    <span className="text-monzo-blue">free prize checker.</span>
                </h1>

                {/* Subheading - Explicit Value Prop */}
                <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto leading-relaxed">
                    We find and check genuinely free UK prize draws and add our own notes so you can see what’s worth your time.
                </p>

                {/* Mailing List - Netlify Form */}
                <div className="max-w-xl mx-auto mb-10">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">

                        {/* Micro-label */}
                        <div className="relative z-10">
                            <p className="text-sm font-bold text-slate-700 mb-4">
                                Free, independent comp checker for UK hobby compers
                            </p>

                            <form
                                name="hunter-club"
                                method="POST"
                                data-netlify="true"
                                className="flex flex-col sm:flex-row gap-2 mb-3"
                            >
                                <input type="hidden" name="form-name" value="hunter-club" />
                                <div className="flex-grow relative">
                                    <label htmlFor="email" className="sr-only">Email address</label>
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        required
                                        placeholder="Your email address"
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-monzo-blue/20 focus:border-monzo-blue outline-none text-slate-900 placeholder:text-slate-400 text-sm"
                                    />
                                </div>
                                <button type="submit" className="bg-monzo-blue hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-sm whitespace-nowrap">
                                    Join the comp list
                                </button>
                            </form>

                            <p className="text-xs text-slate-500 font-medium text-center flex items-center justify-center gap-1.5">
                                <CheckCircle2 size={12} className="text-teal-600" />
                                One friendly email with the week’s safest, best‑value free draws.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <a href="#listings" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-monzo-blue transition-colors uppercase tracking-wider">
                            Browse today's free prizes <ArrowDown size={12} />
                        </a>
                    </div>
                </div>

                {/* Trust Strip - Micro-section */}
                <div className="border-t border-slate-100 pt-8 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left max-w-xl mx-auto">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
                            <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg shrink-0">
                                <UserCheck size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 mb-0.5">Independent checker</h3>
                                <p className="text-[10px] text-slate-500 leading-snug">We scan thousands of UK sites for you.</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
                            <div className="bg-blue-50 text-monzo-blue p-2 rounded-lg shrink-0">
                                <Ban size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 mb-0.5">We never run comps</h3>
                                <p className="text-[10px] text-slate-500 leading-snug">We link you direct to the brand.</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
                            <div className="bg-amber-50 text-amber-600 p-2 rounded-lg shrink-0">
                                <Shield size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 mb-0.5">We flag the pitfalls</h3>
                                <p className="text-[10px] text-slate-500 leading-snug">Effort ratings so you don't waste time.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};
