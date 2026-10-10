import pg from "pg";

// One shared pool for every request. Keep `max` small: Vercel may run several
// instances at once and the Render free plan caps the number of connections.
const globalForPg = globalThis;

const pool =
  globalForPg.pgPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Render's External URL requires SSL
    max: 3,
  });

// Reuse the pool across hot reloads in `next dev`.
if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export default pool;
