import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { deleteSession, requireUser } from "@/lib/session";

// Close the account. Portfolio videos and the avatar go with it (ON DELETE CASCADE).
export async function DELETE(request) {
  const { userId, response } = await requireUser();
  if (response) return response;

  const { password } = (await request.json().catch(() => null)) ?? {};
  if (!password) {
    return Response.json({ error: "Please enter your password." }, { status: 400 });
  }

  const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
  if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
    return Response.json({ error: "Your password is incorrect." }, { status: 400 });
  }

  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await deleteSession();
  return Response.json({ ok: true });
}
