import pool from "@/lib/db";

export async function GET() {
  await pool.query("SELECT 1");
  return Response.json({ ok: true });
}
