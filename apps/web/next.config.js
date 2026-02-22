/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // Transpile shared workspace packages
    transpilePackages: ["@repo/ui"],

    // ─── Remote image domains ────────────────────────────────────────────────
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.googleusercontent.com",
            },
        ],
    },

    // ─── API proxy rewrites ───────────────────────────────────────────────────
    // Requests to /api/:path* are transparently proxied to NEXT_PUBLIC_API_URL.
    // Set NEXT_PUBLIC_API_URL in .env.local, e.g.:
    //   NEXT_PUBLIC_API_URL=https://api.example.com
    async rewrites() {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) {
            console.warn(
                "[next.config.js] NEXT_PUBLIC_API_URL is not set — /api/* rewrites are disabled."
            );
            return [];
        }

        return [
            {
                source: "/api/:path*",
                destination: `${apiUrl}/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
