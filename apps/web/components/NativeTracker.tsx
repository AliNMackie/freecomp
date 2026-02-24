'use client';

import { useEffect } from 'react';

export function NativeTracker() {
    useEffect(() => {
        // Run exactly once on mount
        const captureAnalytics = async () => {
            try {
                const payload = {
                    path: window.location.pathname,
                    referrer: document.referrer || '',
                    userAgent: navigator.userAgent || ''
                };

                // Non-blocking, best-effort fetch
                fetch('/api/analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: true // Ensure it sends even if the user navigates away quickly
                }).catch(err => {
                    // Silently catch network errors to prevent console spam
                    console.debug('Analytics capture failed to send:', err);
                });
            } catch (err) {
                console.debug('Analytics capture failed:', err);
            }
        };

        captureAnalytics();
    }, []); // Empty array ensures this only runs once per page load

    // This component renders nothing, it just runs the effect
    return null;
}
