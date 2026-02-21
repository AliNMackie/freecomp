import { Button } from "@repo/ui";

/**
 * ISR: revalidate this page every 60 seconds.
 * Remove or adjust this export to change the caching strategy.
 * - `false`  → fully static (build-time only)
 * - `0`      → always server-render (SSR)
 * - `N`      → ISR with N-second revalidation window
 */
export const revalidate = 60;

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Monorepo · Web App
            </h1>
            <p className="max-w-md text-center text-neutral-500">
                Next.js 14 with App Router, Tailwind CSS, and ISR. Edit{" "}
                <code className="rounded bg-neutral-100 px-1 py-0.5 text-sm dark:bg-neutral-800">
                    app/page.tsx
                </code>{" "}
                to get started.
            </p>
            <Button label="Get started" />
        </main>
    );
}
