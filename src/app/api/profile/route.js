import pool from "@/lib/db";
import { toProfile, toVideo, validateProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

async function loadProfile(userId) {
  const [{ rows: users }, { rows: videos }] = await Promise.all([
    pool.query("SELECT * FROM users WHERE id = $1", [userId]),
    pool.query(
      "SELECT * FROM portfolio_videos WHERE user_id = $1 ORDER BY sort_order, id",
      [userId],
    ),
  ]);
  if (!users[0]) return null;
  return { profile: toProfile(users[0]), videos: videos.map(toVideo) };
}

// The logged-in user's own profile, including private fields.
export async function GET() {
  const { userId, response } = await requireUser();
  if (response) return response;

  const data = await loadProfile(userId);
  if (!data) return Response.json({ error: "Account not found." }, { status: 404 });
  return Response.json(data);
}

// Update any subset of the profile fields. Username and email are not editable here.
export async function PATCH(request) {
  const { userId, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { columns, errors } = validateProfile(body);
  if (Object.keys(errors).length) {
    return Response.json(
      { error: Object.values(errors)[0], errors },
      { status: 400 },
    );
  }

  const names = Object.keys(columns);
  if (names.length) {
    // Column names come from our own whitelist in lib/profile.js, never from input.
    const assignments = names.map((name, i) => `${name} = $${i + 2}`);
    await pool.query(
      `UPDATE users SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = $1`,
      [userId, ...Object.values(columns)],
    );
  }

  return Response.json(await loadProfile(userId));
}
