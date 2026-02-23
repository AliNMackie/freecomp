import { ShieldCheck } from "lucide-react";

export const metadata = {
    title: "Safety | UKFreeComps",
    description: "How UKFreeComps keeps you safe from spam and scams while comping.",
};

export default function SafetyPage() {
    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20">
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-3xl mx-auto px-4 py-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                            <ShieldCheck size={20} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Safety & Trust</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-12">
                <section className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm prose prose-slate max-w-none">
                    <p className="lead text-lg text-slate-600 mb-8 border-l-4 border-emerald-500 pl-4">
                        Your safety is our priority. Entering competitions online shouldn't mean sacrificing your privacy to spam networks.
                    </p>

                    <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">How we protect you</h2>
                    <div className="grid sm:grid-cols-2 gap-6 mb-8 mt-6">
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-2">Automated Screening</h3>
                            <p className="text-sm text-slate-600">Our Validator Agents analyzes the Terms & Conditions of every competition to ensure the promoter is a legitimate registered business.</p>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-2">Spam Network Blocking</h3>
                            <p className="text-sm text-slate-600">We maintain an active blocklist of notorious data-harvesting sites (like MyOffers) that only exist to sell your details.</p>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-2">Direct Links</h3>
                            <p className="text-sm text-slate-600">We link directly to the brand's official website or social media post. No sketchy redirects.</p>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-2">Clear Entry Requirements</h3>
                            <p className="text-sm text-slate-600">Before you click through, we'll tell you if entering requires providing a phone number or creating an account.</p>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">Best Practices for Compers</h2>
                    <ul className="space-y-3 mb-8 text-slate-600">
                        <li><strong>Use a dedicated email:</strong> Create a separate email address just for entering competitions to keep your main inbox clean.</li>
                        <li><strong>Never pay to claim a prize:</strong> Legitimate promoters will never ask you for money to release a free prize.</li>
                        <li><strong>Be cautious on social media:</strong> Watch out for fake accounts impersonating brands, especially in comment sections telling you that you've won.</li>
                    </ul>
                </section>
            </main>
        </div>
    );
}
