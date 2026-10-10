import pool from "@/lib/db";
import { toVideo, validateVideos } from "@/lib/profile";
import { requireUser } from "@/lib/session";

// Replace the whole portfolio in one go: the editor sends the full, ordered list.
export async function PUT(request) {
  const { userId, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const { videos, error } = validateVideos(body?.videos);
  if (error) return Response.json({ error }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM portfolio_videos WHERE user_id = $1", [userId]);
    for (const [i, v] of videos.entries()) {
      await client.query(
        `INSERT INTO portfolio_videos (user_id, url, platform, niche, role, result, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, v.url, v.platform, v.niche, v.role, v.result, i],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await pool.query(
    "SELECT * FROM portfolio_videos WHERE user_id = $1 ORDER BY sort_order, id",
    [userId],
  );
  return Response.json({ videos: rows.map(toVideo) });
}
