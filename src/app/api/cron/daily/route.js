import pool from "@/lib/db";
import { autoApproveDueJobs, cancelJobForLostPayment } from "@/lib/jobs";
import { notifyPaymentExpiring } from "@/lib/notifications";
import { refreshAuthorization } from "@/lib/payments";

// Once a day (vercel.json; Hobby plan runs it once a day at an imprecise time):
// 1. approve submitted jobs the client left unanswered for 3 days (and pay the freelancer)
// 2. warn about held payments that expire within 3 days; record the ones that expired
//    and cancel their jobs (nobody can be paid for them any more)
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
      // Past its expiry: if PayPal confirms the hold is gone, the job can't be paid and is cancelled.
      const paypal = await refreshAuthorization(r.proposal_id).catch((e) => e.message);
      const event = { EXPIRED: "payment_expired", VOIDED: "payment_voided", DENIED: "payment_voided" }[paypal];
      const cancelled = event ? await cancelJobForLostPayment(r.proposal_id, event) : false;
      expiring.push({ id: r.proposal_id, paypal, cancelled });
    } else {
      await notifyPaymentExpiring(r.proposal_id);
      expiring.push({ id: r.proposal_id, warned: true });
    }
  }

  return Response.json({ approved, expiring });
}
