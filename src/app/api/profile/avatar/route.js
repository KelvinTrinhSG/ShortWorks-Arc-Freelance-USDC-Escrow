import pool from "@/lib/db";
import { avatarUrlOf } from "@/lib/profile";
import { requireUser } from "@/lib/session";

// The browser resizes to 256x256 JPEG first (~30KB), so this cap is generous.
const MAX_BYTES = 300 * 1024;

// Check the file's first bytes rather than trusting the Content-Type header.
function detectImageType(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length > 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  return null;
}

// Body: the raw image bytes.
export async function POST(request) {
  const { userId, response } = await requireUser();
  if (response) return response;

  const buf = Buffer.from(await request.arrayBuffer());
  if (!buf.length) {
    return Response.json({ error: "No image received." }, { status: 400 });
  }
  if (buf.length > MAX_BYTES) {
    return Response.json({ error: "The image is too large." }, { status: 413 });
  }
  const mimeType = detectImageType(buf);
  if (!mimeType) {
    return Response.json({ error: "Use a .png or .jpg image." }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO user_avatars (user_id, data, mime_type, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET data = EXCLUDED.data, mime_type = EXCLUDED.mime_type, updated_at = NOW()`,
    [userId, buf, mimeType],
  );
  const { rows } = await pool.query(
    "UPDATE users SET avatar_updated_at = NOW() WHERE id = $1 RETURNING id, avatar_updated_at",
    [userId],
  );
  return Response.json({ avatarUrl: avatarUrlOf(rows[0]) });
}

export async function DELETE() {
  const { userId, response } = await requireUser();
  if (response) return response;

  await pool.query("DELETE FROM user_avatars WHERE user_id = $1", [userId]);
  await pool.query("UPDATE users SET avatar_updated_at = NULL WHERE id = $1", [userId]);
  return Response.json({ avatarUrl: null });
}
