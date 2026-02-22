import { Pool } from "pg";

declare global {
    // Prevent multiple Pool instances during Next.js hot-reload in development.
    // eslint-disable-next-line no-var
    var __pgPool: Pool | undefined;
}

function createPool(): Pool {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error(
            "DATABASE_URL environment variable is not set. " +
            "Add it to .env.local for development or as a Cloud Run env var in production."
        );
    }

    return new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        ssl:
            process.env.NODE_ENV === "production"
                ? { rejectUnauthorized: false }
                : false,
    });
}

// Reuse the pool across hot-reloads in development; always create fresh in prod.
let _pool: Pool | undefined;

export const getPool = (): Pool => {
    if (process.env.NODE_ENV === "production") {
        if (!_pool) _pool = createPool();
        return _pool;
    }
    // Development logic
    if (!globalThis.__pgPool) {
        globalThis.__pgPool = createPool();
    }
    return globalThis.__pgPool;
};

// For compatibility with existing imports, use a Proxy to defer pool initialization.
export const pool = new Proxy({} as Pool, {
    get: (target, prop) => {
        const p = getPool();
        const val = (p as any)[prop];
        if (typeof val === 'function') {
            return val.bind(p);
        }
        return val;
    }
});
