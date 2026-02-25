import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function run() {
    console.log("Connecting to database to purge old aggregators...");
    const client = await pool.connect();

    try {
        // Delete all competitions that are clearly from aggregators rather than brand pages
        const res = await client.query(`
            DELETE FROM competitions 
            WHERE source_site IN ('SuperLucky', 'Magic Freebies Competitions', 'ThePrizeFinder')
               OR source_url ILIKE '%superlucky.me%'
               OR source_url ILIKE '%magicfreebiesuk.co.uk%'
               OR curated_summary ILIKE '%HOUSE_AD%'
               OR curated_summary ILIKE '%HOUSE AD%'
            RETURNING source_site, title;
        `);

        console.log(\`Deleted \${res.rowCount} old aggregator competitions.\`);
        
        // Let's also verify what's left
        const remaining = await client.query(\`
            SELECT source_site, count(*) 
            FROM competitions 
            GROUP BY source_site
        \`);
        
        console.log("\\nRemaining active competitions by source:");
        remaining.rows.forEach(r => console.log(\`- \${r.source_site}: \${r.count}\`));
        
    } catch (err) {
        console.error("Error purging DB:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
