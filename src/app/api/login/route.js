import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { toSessionUser } from "@/lib/profile";
import { createSession } from "@/lib/session";

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return Response.json(
      { error: "Please enter your email and password." },
      { status: 400 },
    );
  }

  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return Response.json(
      { error: "Incorrect email or password." },
      { status: 401 },
    );
  }

  await createSession(user.id);

  return Response.json(toSessionUser(user));
}
