import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { requireUser } from "@/lib/session";

const MIN_LENGTH = 8;

export async function POST(request) {
  const { userId, response } = await requireUser();
  if (response) return response;

  const { currentPassword, newPassword } = (await request.json().catch(() => null)) ?? {};
  if (!currentPassword || !newPassword) {
    return Response.json({ error: "Please fill in all fields." }, { status: 400 });
  }
  if (typeof newPassword !== "string" || newPassword.length < MIN_LENGTH) {
    return Response.json(
      { error: `The new password must be at least ${MIN_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    return Response.json({ error: "Your current password is incorrect." }, { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    "UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1",
    [userId, hash],
  );
  return Response.json({ ok: true });
}
