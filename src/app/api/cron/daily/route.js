import pool from "@/lib/db";
import { autoApproveDueJobs } from "@/lib/jobs";
import { notifyPaymentExpiring } from "@/lib/notifications";
import { refreshAuthorization } from "@/lib/payments";

// Once a day (vercel.json; Hobby plan runs it once a day at an imprecise time):
// 1. approve submitted jobs the client left unanswered for 3 days (and pay the freelancer)
// 2. warn about held payments that expire within 3 days, and record the ones that expired
// Vercel sends "Authorization: Bearer $CRON_SECRET".
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const approved = await autoApproveDueJobs();

  const { rows } = await pool.query(
    `SELECT jp.proposal_id, jp.expires_at FROM job_payments jp
     JOIN proposals pr ON pr.id = jp.proposal_id
     WHERE jp.status = 'authorized' AND jp.expires_at < NOW() + INTERVAL '3 days'`,
  );
  const expiring = [];
  for (const r of rows) {
    if (new Date(r.expires_at) < new Date()) {
      expiring.push({ id: r.proposal_id, paypal: await refreshAuthorization(r.proposal_id).catch((e) => e.message) });
    } else {
      await notifyPaymentExpiring(r.proposal_id);
      expiring.push({ id: r.proposal_id, warned: true });
    }
  }

  return Response.json({ approved, expiring });
}
