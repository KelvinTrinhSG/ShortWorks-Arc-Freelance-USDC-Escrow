import { cancelJobForLostPayment } from "@/lib/jobs";
import { applyWebhookEvent } from "@/lib/payments";
import { verifyWebhook } from "@/lib/paypal";

// PayPal events (payments voided / captured / denied elsewhere, sellers connecting or
// disconnecting). Only events PayPal confirms it sent are applied.
export async function POST(request) {
  const event = await request.json().catch(() => null);
  if (!event?.event_type) return Response.json({ error: "Bad request" }, { status: 400 });
  if (!(await verifyWebhook(request.headers, event).catch(() => false))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  // A hold voided outside ShortWorks: the job can no longer be paid, so it is cancelled.
  const lostPaymentJob = await applyWebhookEvent(event);
  if (lostPaymentJob) await cancelJobForLostPayment(lostPaymentJob, "payment_voided");
  return Response.json({ ok: true });
}
