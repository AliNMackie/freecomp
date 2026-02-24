import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { path, referrer, userAgent } = body;

        // Basic validation
        if (!path || typeof path !== 'string') {
            return new NextResponse(null, { status: 400 });
        }

        // Extremely basic device parsing (just for rudimentary analytics)
        let deviceType = 'desktop';
        if (userAgent) {
            const ua = userAgent.toLowerCase();
            if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
                deviceType = 'tablet';
            } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
                deviceType = 'mobile';
            }
        }

        const safePath = path.slice(0, 2048);
        const safeReferrer = referrer ? referrer.slice(0, 2048) : null;
        const safeDeviceType = deviceType.slice(0, 50);

        // Best effort insert. We don't want to crash or wait if the DB is slow.
        pool.query(
            `INSERT INTO analytics_events (path, referrer, device_type) VALUES ($1, $2, $3)`,
            [safePath, safeReferrer, safeDeviceType]
        ).catch(err => {
            console.error('[Analytics Tracker] DB Insert failed:', err.message);
        });

        // Always return success immediately to unblock the client
        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error('[Analytics Tracker] Route Error:', error instanceof Error ? error.message : String(error));
        // Return 204 even on error to prevent client-side concern
        return new NextResponse(null, { status: 204 });
    }
}
