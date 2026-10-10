import pool from "@/lib/db";
import { toSessionUser } from "@/lib/profile";
import { deleteSession, getSession } from "@/lib/session";

// Current user from the session cookie, or { user: null } for guests.
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ user: null });

  const { rows } = await pool.query(
    "SELECT id, display_name, username, email, account_type, avatar_updated_at FROM users WHERE id = $1",
    [session.userId],
  );
  const user = rows[0];

  // The account was deleted after the cookie was issued.
  if (!user) {
    await deleteSession();
    return Response.json({ user: null });
  }

  return Response.json({ user: toSessionUser(user) });
}
