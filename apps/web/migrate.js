require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function migrate() {
    const client = new Client(process.env.DATABASE_URL);
    await client.connect();

    try {
        await client.query(`
            ALTER TABLE competitions 
            ADD COLUMN IF NOT EXISTS exemption_type VARCHAR(50) DEFAULT 'unknown' CHECK (exemption_type IN ('free_draw', 'prize_competition', 'unknown')),
            ADD COLUMN IF NOT EXISTS free_route_verified BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS skill_test_required BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS subscription_risk BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS premium_rate_detected BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS brand_logo_url VARCHAR(2048),
            ADD COLUMN IF NOT EXISTS click_count INT DEFAULT 0;
            
            CREATE TABLE IF NOT EXISTS analytics_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                path VARCHAR(2048) NOT NULL,
                referrer VARCHAR(2048),
                device_type VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('Migration successful.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

migrate();
