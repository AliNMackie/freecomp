import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // ISR default: pages can override with `export const revalidate = N` in route segments.
    // Set a global default if desired — 0 means always SSR, false means full static.
    // Individual route segments override this value.

    // Example: enable React strict mode
    reactStrictMode: true,

    // Transpile @repo/* workspace packages
    transpilePackages: ["@repo/ui"],
};

export default nextConfig;
