import fs from "fs";
import path from "path";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("[db-migrate] DATABASE_URL is not set. Aborting.");
    process.exit(1);
}

// Resolve schema.sql relative to repo root regardless of cwd.
const SCHEMA_PATH = path.resolve(__dirname, "../../../db/schema.sql");

async function migrate(): Promise<void> {
    const sql = fs.readFileSync(SCHEMA_PATH, "utf8");

    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    try {
        console.log("[db-migrate] Running schema migrations…");
        await client.query(sql);
        console.log("[db-migrate] Migrations complete.");
    } finally {
        await client.end();
    }
}

migrate().catch((err) => {
    console.error("[db-migrate] Migration failed:", err);
    process.exit(1);
});
