import pool from "@/lib/db";

// Public: profile photos are shown to clients. URLs carry ?v=<timestamp>,
// so a new upload gets a new URL and the old one can be cached for good.
export async function GET(_request, { params }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new Response(null, { status: 404 });

  const { rows } = await pool.query(
    "SELECT data, mime_type FROM user_avatars WHERE user_id = $1",
    [id],
  );
  if (!rows[0]) return new Response(null, { status: 404 });

  return new Response(rows[0].data, {
    headers: {
      "Content-Type": rows[0].mime_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
