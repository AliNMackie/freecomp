import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = body;

        // Basic email validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { error: 'Valid email address is required' },
                { status: 400 }
            );
        }

        const API_KEY = process.env.BEEHIIV_API_KEY;
        const PUB_ID = process.env.BEEHIIV_PUBLICATION_ID;

        if (!API_KEY || !PUB_ID) {
            console.error('Missing Beehiiv environment variables');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // Call Beehiiv API v2
        const response = await fetch(
            `https://api.beehiiv.com/v2/publications/${PUB_ID}/subscriptions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${API_KEY}`,
                },
                body: JSON.stringify({
                    email: email,
                    reactivate_existing: true,
                    send_welcome_email: true,
                    utm_source: 'Nextjs_Aggregator',
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            // Log the error for internal tracking but return a safe message
            console.error('Beehiiv API Error:', data);
            return NextResponse.json(
                { error: data.message?.[0] || 'Failed to subscribe. Please try again later.' },
                { status: response.status }
            );
        }

        // 201 Created is the success response from Beehiiv for a new subscription
        return NextResponse.json(
            { message: 'Successfully subscribed' },
            { status: 201 }
        );

    } catch (error) {
        console.error('Subscription error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
