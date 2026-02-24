import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    // Only apply HTTP Basic Auth to the /admin routes
    if (req.nextUrl.pathname.startsWith('/admin')) {
        const basicAuth = req.headers.get('authorization');

        if (basicAuth) {
            const authValue = basicAuth.split(' ')[1];
            const [user, pwd] = atob(authValue).split(':');

            const adminUser = process.env.ADMIN_USER;
            const adminPass = process.env.ADMIN_PASS;

            if (user === adminUser && pwd === adminPass) {
                return NextResponse.next();
            }
        }

        // Require authentication
        const url = req.nextUrl;
        url.pathname = '/api/auth';

        return new NextResponse('Auth Required.', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Secure Admin Area"',
            },
        });
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
