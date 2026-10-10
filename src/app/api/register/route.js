import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(request) {
  const { displayName, username, email, password } = await request.json();

  if (!displayName || !username || !email || !password) {
    return Response.json(
      { error: "Please fill in all fields." },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (display_name, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, display_name, username, email`,
      [displayName, username, email.toLowerCase(), hash],
    );
    const user = rows[0];
    await createSession(user.id);
    return Response.json(
      {
        id: user.id,
        displayName: user.display_name,
        username: user.username,
        email: user.email,
      },
      { status: 201 },
    );
  } catch (err) {
    // 23505 = unique violation (email or username already taken)
    if (err.code === "23505") {
      return Response.json(
        { error: "Email or username is already taken." },
        { status: 409 },
      );
    }
    throw err;
  }
}
