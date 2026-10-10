// Runs every db/*.sql file in name order against DATABASE_URL.
// Each file is written to be safe to run again, so this can be re-run any time.
//   npm run db:migrate
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const dir = path.join(import.meta.dirname, "..", "db");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  for (const file of files) {
    await client.query(await readFile(path.join(dir, file), "utf8"));
    console.log(`✓ ${file}`);
  }
} finally {
  await client.end();
}
