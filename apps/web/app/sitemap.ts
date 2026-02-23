import { MetadataRoute } from 'next';
import { pool } from '@/lib/db';

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://iaifreecomp.netlify.app';

    // Static routes
    const routes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'always',
            priority: 1,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/safety`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
    ];

    try {
        // Fetch recently verified active competitions for dynamic sitemap inclusion
        const result = await pool.query(`
            SELECT id, verified_at 
            FROM competitions 
            WHERE is_free = TRUE 
            ORDER BY verified_at DESC 
            LIMIT 100
        `);

        const competitionRoutes: MetadataRoute.Sitemap = result.rows.map((comp) => ({
            url: `${baseUrl}/competitions/${comp.id}`,
            lastModified: comp.verified_at || new Date(),
            changeFrequency: 'daily',
            priority: 0.6,
        }));

        return [...routes, ...competitionRoutes];
    } catch (err) {
        console.error("Sitemap generation error:", err);
        return routes; // Return static routes if DB fails gracefully
    }
}
