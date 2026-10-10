import "server-only";
import pool from "@/lib/db";
import { getSession } from "@/lib/session";

// The logged-in user with their account type, or null for guests.
// Kept out of session.js because proxy.js imports that file and must not load pg.
export async function getViewer() {
  const session = await getSession();
  if (!session?.userId) return null;
  const { rows } = await pool.query(
    "SELECT id, username, account_type FROM users WHERE id = $1",
    [session.userId],
  );
  return rows[0]
    ? { id: rows[0].id, username: rows[0].username, accountType: rows[0].account_type }
    : null;
}
