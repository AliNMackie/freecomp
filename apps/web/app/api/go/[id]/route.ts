import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a new ratelimiter that allows 10 requests per 10 seconds per IP
const ratelimit = process.env.UPSTASH_REDIS_REST_URL
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(10, "10 s"),
        analytics: true,
    })
    : null;

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        // Handle Next.js 15+ promise params while remaining backwards compatible
        const params = await Promise.resolve(context.params);
        const { id } = params;

        if (!id) {
            return NextResponse.redirect(new URL("/", request.url));
        }

        if (ratelimit) {
            const ip = request.ip || request.headers.get("x-forwarded-for") || "127.0.0.1";
            const { success } = await ratelimit.limit(`click_${ip}`);
            if (!success) {
                return new NextResponse("Too Many Requests", { status: 429 });
            }
        }

        const result = await pool.query(
            `UPDATE competitions 
             SET click_count = click_count + 1 
             WHERE id = $1 
             RETURNING source_url`,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.redirect(new URL("/", request.url));
        }

        const destUrl = result.rows[0].source_url;

        if (!destUrl) {
            return NextResponse.redirect(new URL("/", request.url));
        }

        const skimlinksId = process.env.SKIMLINKS_SITE_ID || 'PLACEHOLDER_SITE_ID';
        const skimlinksUrl = `https://go.redirectingat.com/?id=${skimlinksId}&url=${encodeURIComponent(destUrl)}`;

        return NextResponse.redirect(skimlinksUrl, 302);
    } catch (error) {
        console.error("Error in /api/go/[id] redirection route:", error);
        return NextResponse.redirect(new URL("/", request.url));
    }
}
