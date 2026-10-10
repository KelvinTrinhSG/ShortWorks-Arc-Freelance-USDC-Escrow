import pool from "@/lib/db";

// GET /api/check-availability?username=...&email=...
// Returns { username: true } / { email: true } for values that are already taken.
export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const username = params.get("username")?.trim();
  const email = params.get("email")?.trim().toLowerCase();
  const result = {};

  if (username) {
    const { rowCount } = await pool.query(
      "SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)",
      [username],
    );
    result.username = rowCount > 0;
  }

  if (email) {
    const { rowCount } = await pool.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email],
    );
    result.email = rowCount > 0;
  }

  return Response.json(result);
}
