import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Setup database client
const getDbClient = () => {
    // If running in development or a script, use the full connection string
    if (process.env.DATABASE_URL) {
        return new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    // Standard postgres env config fallback
    return new Client({
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT || '5432', 10),
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
};

function generateNewsletterHTML(competitions: any[]) {
    // Generate the competition blocks
    const compBlocks = competitions.map((comp: any) => {
        const brand = comp.source_site || 'Aggregator';
        const hype = comp.hype_score || 'N/A';
        const effort = comp.entry_time_estimate || 'Quick';
        const summary = comp.curated_summary ? `"${comp.curated_summary}"` : '"A great free prize draw to enter today."';

        return `
            <tr>
                <td style="padding: 0 0 20px 0;">
                    <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #1e293b; font-weight: bold;">${comp.title}</h2>
                    <p style="margin: 0 0 5px 0; font-size: 14px; color: #475569;">🏢 Brand: ${brand}</p>
                    <p style="margin: 0 0 15px 0; font-size: 14px; color: #475569;">🔥 Hype Score: ${hype}/10 | ⏱️ Effort: ${effort}</p>
                    
                    <blockquote style="margin: 0 0 20px 0; padding: 15px; background-color: #f1f5f9; border-left: 4px solid #cbd5e1; font-style: italic; font-size: 14px; color: #334155;">
                        ${summary}
                    </blockquote>
                    
                    <div style="text-align: center;">
                        <a href="https://ukfreecomps.com/api/go/${comp.id}" style="display: block; width: 100%; box-sizing: border-box; background-color: #2563eb; color: #ffffff; padding: 14px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; text-align: center;">ENTER COMPETITION ➔</a>
                    </div>
                </td>
            </tr>
            <tr>
                <td style="padding: 0 0 20px 0;">
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;" />
                </td>
            </tr>
        `;
    }).join('');

    // Wrap in standard mobile-responsive email table
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>UKFreeComps Newsletter</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f8fafc">
                <tr>
                    <td align="center" style="padding: 40px 10px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <tr>
                                <td align="center" style="padding: 30px 20px; background-color: #ffffff; border-bottom: 2px solid #f1f5f9;">
                                    <h1 style="margin: 0; font-size: 24px; color: #0f172a; text-align: center;">This Week's Top Verified Prizes</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 30px 20px 10px 20px;">
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                        ${compBlocks}
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 20px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                                        Want more? Share this email with 3 friends using your unique beehiiv link below, and we'll send you our secret list of low-entry local draws.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
}

async function runPublisherAgent() {
    console.log('[Publisher] Starting Newsletter Generation...');

    const client = getDbClient();
    try {
        await client.connect();

        // Query top 5 recent competitions with hype_score >= 8, closing in the future, and known exemption_type
        const res = await client.query(`
            SELECT * FROM competitions 
            WHERE hype_score >= 8
            AND closes_at > NOW()
            AND exemption_type IS NOT NULL
            ORDER BY discovered_at DESC
            LIMIT 5
        `);

        if (res.rows.length === 0) {
            console.log('[Publisher] No active high-hype competitions found. Aborting publish.');
            return;
        }

        console.log(`[Publisher] Found ${res.rows.length} valid competitions. Generating HTML...`);
        const generatedHTML = generateNewsletterHTML(res.rows);

        const API_KEY = process.env.BEEHIIV_API_KEY;
        const PUB_ID = process.env.BEEHIIV_PUBLICATION_ID;

        if (!API_KEY || !PUB_ID) {
            throw new Error('Missing Beehiiv environment variables (BEEHIIV_API_KEY or BEEHIIV_PUBLICATION_ID)');
        }

        console.log('[Publisher] Sending draft to Beehiiv API v2...');
        const response = await fetch(
            `https://api.beehiiv.com/v2/publications/${PUB_ID}/posts`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${API_KEY}`,
                },
                body: JSON.stringify({
                    title: "Your AI-Scouted Free Prizes for the Week",
                    status: "draft",
                    content_tags: ["competitions", "free"],
                    web_title: "Top 5 Free Prizes",
                    content_html: generatedHTML
                }),
            }
        );

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Beehiiv API failed with status ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        console.log(`[Publisher] Success! Newsletter draft created. Post ID: ${data.data?.id}`);

    } catch (error) {
        console.error('[Publisher] Error during run:', error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('[Publisher] Database connection closed.');
    }
}

// Run the script if executed directly
if (require.main === module) {
    runPublisherAgent();
}
