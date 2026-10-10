import bcrypt from "bcryptjs";
import { ACCOUNT_TYPES } from "@/data/talentOptions";
import pool from "@/lib/db";
import { toSessionUser } from "@/lib/profile";
import { createSession } from "@/lib/session";

export async function POST(request) {
  const { displayName, username, email, password, accountType } =
    await request.json();

  if (!displayName || !username || !email || !password) {
    return Response.json(
      { error: "Please fill in all fields." },
      { status: 400 },
    );
  }
  if (!ACCOUNT_TYPES.some((t) => t.value === accountType)) {
    return Response.json(
      { error: "Choose Hire A Freelancer or Become a Freelancer." },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (display_name, username, email, password_hash, account_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, display_name, username, email, account_type, avatar_updated_at`,
      [displayName, username, email.toLowerCase(), hash, accountType],
    );
    const user = rows[0];
    await createSession(user.id);
    return Response.json(toSessionUser(user), { status: 201 });
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
