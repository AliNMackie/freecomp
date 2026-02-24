import React from 'react';

export const metadata = {
    title: 'Privacy Policy | UKFreeComps',
    description: 'Read the UKFreeComps Privacy Policy to understand how we handle your data, local storage for tracking entries, and cookies.',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-16 bg-white my-8 rounded-xl shadow-sm border border-slate-100">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
            <p className="text-sm text-slate-500 mb-8">Last Updated: {new Date().toLocaleDateString('en-GB')}</p>

            <div className="prose prose-sm prose-slate max-w-none space-y-6">
                <section>
                    <h2 className="text-xl font-bold text-slate-800">1. Introduction</h2>
                    <p>
                        Welcome to UKFreeComps. We are committed to protecting your personal information and your right to privacy.
                        This Privacy Policy applies to all users of our website. Since we operate as an aggregator, we collect very
                        little personal data directly.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800">2. Local Storage and Guest Tracking</h2>
                    <p>
                        To enhance your experience, particularly our "Mark as Entered" feature, we utilise your browser's Local Storage.
                        When you click "Mark as Entered" on a competition card, we store a small piece of data (a boolean flag tied to
                        the competition ID) directly on your device.
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>This data is stored <strong>locally on your device</strong>, not on our servers.</li>
                        <li>This allows you to track entries as a guest without creating an account.</li>
                        <li>You can clear this data at any time by clearing your browser's local storage or cache.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800">3. Cookies and Analytics</h2>
                    <p>
                        We use standard third-party cookies for essential site analytics and affiliate link tracking.
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Analytics:</strong> We may use basic analytics to understand which regions in the UK visit our site and which competitions are popular, helping us curate better content.</li>
                        <li><strong>Affiliate Tracking:</strong> When you click on an "Enter" link, a cookie may be placed by the third-party competition host or an affiliate network. This confirms we referred you to their site. This tracking is anonymous and does not reveal your personal identity to us.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800">4. Third-Party Links</h2>
                    <p>
                        Our website contains links to external competitions and offers. Once you leave UKFreeComps to enter a competition,
                        you are subject to the privacy policy of that third-party website. We are not responsible for the data collection
                        practices of external sites.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-bold text-slate-800">5. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at [Insert Contact Email/Form Link].
                    </p>
                </section>
            </div>
        </div>
    );
}
