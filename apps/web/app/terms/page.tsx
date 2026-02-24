import React from 'react';

export const metadata = {
    title: 'Terms of Use | UKFreeComps',
    description: 'Terms of Use and Conditions for using the UKFreeComps competition aggregator platform.',
};

export default function TermsPage() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-16 bg-white my-8 rounded-xl shadow-sm border border-slate-100">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Terms of Use</h1>
            <p className="text-sm text-slate-500 mb-8">Last Updated: {new Date().toLocaleDateString('en-GB')}</p>

            <div className="prose prose-sm prose-slate max-w-none space-y-6">
                <section>
                    <h2 className="text-xl font-bold text-slate-800">1. Acceptance of Terms</h2>
                    <p>
                        By accessing and using UKFreeComps, you accept and agree to be bound by these Terms of Use.
                        If you do not agree to these terms, please do not use our website. We are a UK-focused service
                        intended for residents of the United Kingdom aged 18 or older.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800">2. Our Service & Aggregator Status</h2>
                    <p>
                        UKFreeComps is a free-to-use directory and aggregator of third-party competitions, draws, and prize promotions.
                        <strong>We do not host or run the competitions listed on our platform.</strong>
                    </p>
                    <p className="mt-2">
                        While our AI and human editors strive to verify the legitimacy and safety of listed links,
                        we cannot guarantee the availability, fairness, or prize fulfilment of any third-party competition.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800">3. User Responsibilities</h2>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>You must review the Terms & Conditions of the specific promoter before entering any competition.</li>
                        <li>You are responsible for ensuring you meet the eligibility criteria (e.g., age, location) for third-party sites.</li>
                        <li>You agree not to use automated scripts, bots, or scrapers against our website infrastructure.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800">4. Disclaimer of Liability</h2>
                    <p>
                        UKFreeComps shall not be held liable for any loss, damage, or disappointment arising from your participation
                        in external competitions. Any disputes regarding prizes, entries, or rules must be resolved directly with
                        the competition promoter.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800">5. Governing Law</h2>
                    <p>
                        These Terms of Use are governed by and construed in accordance with the laws of England and Wales.
                        Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
                    </p>
                </section>
            </div>
        </div>
    );
}
