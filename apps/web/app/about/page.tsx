import { Zap } from "lucide-react";

export const metadata = {
    title: "About | UKFreeComps",
    description: "Learn about UKFreeComps and how we find genuinely free UK prize draws.",
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20">
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-3xl mx-auto px-4 py-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-monzo-blue rounded-lg flex items-center justify-center text-white">
                            <Zap size={20} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">About UKFreeComps</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-12">
                <section className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm prose prose-slate max-w-none">
                    <p className="lead text-lg text-slate-600 mb-8 border-l-4 border-monzo-blue pl-4">
                        We are building the UK's safest, most independent database of free prize draws and competitions.
                    </p>

                    <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">How it works</h2>
                    <p className="text-slate-600 mb-6">
                        Every day, thousands of brands run promotional giveaways. Finding the good ones hidden amongst the spam takes hours.
                        Our custom AI agents scour the internet 24/7 to find these competitions, verify they are actually free to enter, and score them based on the prize value and entry difficulty.
                    </p>

                    <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4">Our Mission</h2>
                    <ul className="space-y-3 mb-8 text-slate-600">
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span><strong>No Hidden Fees:</strong> We only list competitions that are 100% free to enter.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span><strong>No Spam Networks:</strong> We filter out known data-harvesting operations.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span><strong>Clear Transparency:</strong> We show you exactly what is required to enter before you click.</span>
                        </li>
                    </ul>
                </section>
            </main>
        </div>
    );
}
