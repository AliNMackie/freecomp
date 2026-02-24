import React from 'react';
import Link from 'next/link';

export const Footer = () => {
    return (
        <footer className="bg-white border-t border-slate-200 mt-12 w-full">
            <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">

                    {/* Brand & Copyright */}
                    <div className="text-center md:text-left text-slate-500 text-[10px] leading-relaxed max-w-sm">
                        <p className="font-bold text-slate-700 mb-1 text-xs">UKFreeComps</p>
                        <p className="mb-2">We are an independent aggregator. We verify safety but are not responsible for third-party prize fulfilment.</p>
                        <p>&copy; {new Date().getFullYear()} UKFreeComps. All rights reserved.</p>
                    </div>

                    {/* Legal Links */}
                    <div className="flex items-center gap-6 text-xs font-semibold text-slate-500">
                        <Link href="/how-we-make-money" className="hover:text-monzo-blue transition-colors underline underline-offset-2 decoration-slate-200">
                            How we make money
                        </Link>
                        <Link href="/privacy" className="hover:text-monzo-blue transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/terms" className="hover:text-monzo-blue transition-colors">
                            Terms of Use
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
