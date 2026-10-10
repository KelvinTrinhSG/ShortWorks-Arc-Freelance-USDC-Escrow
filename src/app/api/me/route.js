import pool from "@/lib/db";
import { deleteSession, getSession } from "@/lib/session";

// Current user from the session cookie, or { user: null } for guests.
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ user: null });

  const { rows } = await pool.query(
    "SELECT id, display_name, username, email FROM users WHERE id = $1",
    [session.userId],
  );
  const user = rows[0];

  // The account was deleted after the cookie was issued.
  if (!user) {
    await deleteSession();
    return Response.json({ user: null });
  }

  return Response.json({
    user: {
      id: user.id,
      displayName: user.display_name,
      username: user.username,
      email: user.email,
    },
  });
}
