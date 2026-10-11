import "server-only";
import pool from "@/lib/db";

// ShortWorks staff who settle disputes: the emails in ADMIN_EMAILS (comma-separated).
export async function isAdmin(viewer) {
  if (!viewer) return false;
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.length) return false;
  const { rows } = await pool.query("SELECT LOWER(email) AS email FROM users WHERE id = $1", [viewer.id]);
  return admins.includes(rows[0]?.email);
}
