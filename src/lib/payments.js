import "server-only";
import { MAX_DELIVERY_DAYS, platformFeeFor } from "@/data/projectOptions";
import pool from "@/lib/db";
import { notifyProposalDecision } from "@/lib/notifications";
import {
  PayPalError,
  authorizeOrder,
  captureAuthorization,
  createOrder,
  createPartnerReferral,
  findMerchantIdByTrackingId,
  getAuthorization,
  getCapture,
  getMerchantIntegration,
  voidAuthorization,
} from "@/lib/paypal";
import { randomBytes } from "node:crypto";

// Money on a job (docs/payments.md): hiring holds it (authorize), approving takes it
// (capture: the freelancer is paid, ShortWorks keeps the platform fee), undoing a hire
// or losing a dispute releases it (void). Amounts always come from the database.

const CURRENCY = "USD";
const money = (n) => (n == null ? null : Number(n));
const todayUtc = () => new Date().toISOString().slice(0, 10);
const addDays = (date, days) => new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);

// Error with an HTTP status for the API routes.
export class PaymentError extends Error {
  constructor(message, code = 409, debugId) {
    super(message);
    this.code = code;
    this.debugId = debugId;
  }
}

// PayPal errors become a readable message, with the debug_id to ask PayPal about.
const fromPayPal = (err, what) =>
  err instanceof PayPalError
    ? new PaymentError(`PayPal couldn't ${what}: ${err.message}${err.debugId ? ` (debug_id ${err.debugId})` : ""}`, 502, err.debugId)
    : err;

// ---- Freelancer's PayPal account ---------------------------------------------

export async function getPaypalAccount(userId) {
  const { rows } = await pool.query(
    "SELECT paypal_status, paypal_merchant_id, paypal_checked_at FROM users WHERE id = $1",
    [userId],
  );
  const r = rows[0];
  return r ? { status: r.paypal_status, merchantId: r.paypal_merchant_id, checkedAt: r.paypal_checked_at } : null;
}

// Link to PayPal's sign-up/consent page. The tracking id identifies the freelancer when they come back.
export async function startOnboarding(userId, returnUrl) {
  const account = await getPaypalAccount(userId);
  if (account?.status === "ready") throw new PaymentError("Your PayPal account is already connected.");
  const { rows } = await pool.query(
    `UPDATE users SET paypal_tracking_id = COALESCE(paypal_tracking_id, $2), paypal_status = 'pending'
     WHERE id = $1 RETURNING paypal_tracking_id`,
    [userId, `sw-${userId}-${randomBytes(6).toString("hex")}`],
  );
  try {
    return await createPartnerReferral(rows[0].paypal_tracking_id, returnUrl);
  } catch (err) {
    throw fromPayPal(err, "start the connection");
  }
}

// Asks PayPal where the freelancer's connection stands and saves it.
// Ready = connected + able to receive payments + email confirmed.
export async function syncPaypalAccount(userId) {
  const { rows } = await pool.query(
    "SELECT paypal_tracking_id, paypal_merchant_id, paypal_status FROM users WHERE id = $1",
    [userId],
  );
  const u = rows[0];
  if (!u?.paypal_tracking_id) return getPaypalAccount(userId);
  try {
    const merchantId = u.paypal_merchant_id ?? (await findMerchantIdByTrackingId(u.paypal_tracking_id));
    if (!merchantId) return getPaypalAccount(userId); // not finished on PayPal yet
    const info = await getMerchantIntegration(merchantId);
    // The account must be the one this freelancer connected (tracking id we sent).
    if (info.tracking_id && info.tracking_id !== u.paypal_tracking_id) {
      throw new PaymentError("This PayPal account belongs to another ShortWorks profile.", 403);
    }
    const ready = info.payments_receivable === true && info.primary_email_confirmed === true;
    await pool.query(
      `UPDATE users SET paypal_merchant_id = $2, paypal_status = $3, paypal_checked_at = NOW() WHERE id = $1`,
      [userId, info.merchant_id ?? merchantId, ready ? "ready" : "blocked"],
    );
    return { ...(await getPaypalAccount(userId)), paymentsReceivable: info.payments_receivable === true, emailConfirmed: info.primary_email_confirmed === true };
  } catch (err) {
    throw fromPayPal(err, "check your account");
  }
}

export async function findUserByTrackingId(trackingId) {
  const { rows } = await pool.query("SELECT id FROM users WHERE paypal_tracking_id = $1", [trackingId]);
  return rows[0]?.id ?? null;
}

// ---- Hire & pay ---------------------------------------------------------------

// The proposal with everything needed to charge for it.
async function getHireContext(proposalId) {
  if (!/^\d+$/.test(String(proposalId))) return null;
  const { rows } = await pool.query(
    `SELECT pr.id, pr.status, pr.price_per_video, to_char(pr.delivery_date, 'YYYY-MM-DD') AS delivery_date,
            p.id AS project_id, p.client_id, p.title, p.video_count,
            u.display_name AS freelancer_name, u.paypal_status, u.paypal_merchant_id,
            jp.status AS payment_status, jp.order_id
     FROM proposals pr
     JOIN projects p ON p.id = pr.project_id
     JOIN users u ON u.id = pr.freelancer_id
     LEFT JOIN job_payments jp ON jp.proposal_id = pr.id
     WHERE pr.id = $1`,
    [proposalId],
  );
  return rows[0] ?? null;
}

// Why the client can't hire this proposal right now, or null. Shared by the page and the API.
// `method`: "paypal" (default) needs the freelancer's PayPal; "arc" needs their verified Arc wallet.
export function hireBlocker({ status, deliveryDate, paypalStatus, arcWallet, method = "paypal" }, today = todayUtc()) {
  if (status !== "pending") return "This proposal was already answered.";
  if (method === "paypal" && paypalStatus !== "ready") return "The freelancer hasn't connected PayPal yet, so they can't be paid.";
  if (method === "arc" && !arcWallet) return "The freelancer hasn't added an Arc wallet yet, so they can't be paid in USDC.";
  if (deliveryDate < today) return "The delivery date has passed. Ask the freelancer to update their proposal.";
  if (deliveryDate > addDays(today, MAX_DELIVERY_DAYS)) {
    return `Delivery must be within ${MAX_DELIVERY_DAYS} days of hiring. Ask the freelancer to update the date.`;
  }
  return null;
}

// Step 1: the client clicked the PayPal button. Creates the order, paid to the freelancer.
export async function startCheckout(proposalId, viewer) {
  const h = await getHireContext(proposalId);
  if (!h) throw new PaymentError("Proposal not found.", 404);
  if (h.client_id !== viewer.id) throw new PaymentError("Only the project owner can hire.", 403);
  const blocker = hireBlocker({ status: h.status, deliveryDate: h.delivery_date, paypalStatus: h.paypal_status });
  if (blocker) throw new PaymentError(blocker);
  if (["authorized", "capturing", "captured", "voiding"].includes(h.payment_status)) {
    throw new PaymentError("This freelancer is already paid for.");
  }
  if (await hasLivePayment({ proposalId: h.id })) {
    throw new PaymentError("This freelancer is already paid for with USDC on Arc.");
  }

  const amount = Math.round(Number(h.price_per_video) * h.video_count * 100) / 100;
  const platformFee = platformFeeFor(amount);
  // Same id for the same checkout (proposal, amount, freelancer, within the hour), so a
  // double click or a second tab gets the same order back from PayPal instead of a new
  // one that makes the first tab fail. After a failed or released attempt, a new order.
  const retryOf = ["voided", "expired", "failed"].includes(h.payment_status) ? h.order_id : "first";
  const requestId = ["sw-order", h.id, Math.round(amount * 100), h.paypal_merchant_id, Math.floor(Date.now() / 3600000), retryOf].join("-");
  let order;
  try {
    order = await createOrder({
      sellerMerchantId: h.paypal_merchant_id,
      amount,
      currency: CURRENCY,
      referenceId: `job-${h.id}`,
      description: `ShortWorks: ${h.title} (${h.video_count} videos, ${h.freelancer_name})`,
      requestId,
    });
  } catch (err) {
    throw fromPayPal(err, "start the payment");
  }
  // One row per proposal: an abandoned or released earlier attempt is replaced.
  await pool.query(
    `INSERT INTO job_payments (proposal_id, seller_merchant_id, order_id, currency, amount, platform_fee, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'created')
     ON CONFLICT (proposal_id) DO UPDATE SET
       seller_merchant_id = EXCLUDED.seller_merchant_id, order_id = EXCLUDED.order_id,
       amount = EXCLUDED.amount, platform_fee = EXCLUDED.platform_fee, status = 'created',
       authorization_id = NULL, capture_id = NULL, expires_at = NULL, last_debug_id = NULL, updated_at = NOW()
     WHERE job_payments.status IN ('created', 'voided', 'expired', 'failed')`,
    [h.id, h.paypal_merchant_id, order.id, CURRENCY, amount, platformFee],
  );
  return { orderId: order.id };
}

// Step 2: the client approved in PayPal. Holds the money, then hires (proposal accepted).
// Returns true when the hire went through.
export async function completeCheckout(proposalId, orderId, viewer) {
  const h = await getHireContext(proposalId);
  if (!h) throw new PaymentError("Proposal not found.", 404);
  if (h.client_id !== viewer.id) throw new PaymentError("Only the project owner can hire.", 403);
  if (h.order_id !== orderId || h.payment_status !== "created") {
    throw new PaymentError("This payment is no longer valid. Please start again.");
  }

  const { rows: pay } = await pool.query("SELECT seller_merchant_id, amount FROM job_payments WHERE proposal_id = $1", [h.id]);
  // The freelancer edited the price after the order was made: don't hold the old amount.
  if (Number(pay[0].amount) !== Math.round(Number(h.price_per_video) * h.video_count * 100) / 100) {
    throw new PaymentError("The freelancer changed the price while you were paying. Nothing was charged; please start again.");
  }
  let authorization;
  try {
    ({ authorization } = await authorizeOrder(orderId, pay[0].seller_merchant_id));
  } catch (err) {
    await pool.query("UPDATE job_payments SET status = 'failed', last_debug_id = $2, updated_at = NOW() WHERE proposal_id = $1", [h.id, err.debugId ?? null]);
    throw fromPayPal(err, "hold the payment");
  }

  const client = await pool.connect();
  let hired = false;
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE job_payments SET status = 'authorized', authorization_id = $2, expires_at = $3, updated_at = NOW()
       WHERE proposal_id = $1`,
      [h.id, authorization.id, authorization.expiration_time ?? null],
    );
    // Only if nobody changed the proposal in the meantime (withdrawn, edited away...).
    const res = await client.query(
      `UPDATE proposals SET status = 'accepted', accepted_at = NOW(), job_status = 'in_progress',
              status_before_dispute = NULL, completed_at = NULL
       WHERE id = $1 AND status = 'pending'`,
      [h.id],
    );
    hired = res.rowCount === 1;
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  if (!hired) {
    // The money is held but the hire can't happen: let it go again.
    await releasePayment(h.id).catch(() => {});
    throw new PaymentError("The proposal changed while you were paying. Nothing was charged.");
  }
  await notifyProposalDecision(h.id, "accepted");
  return true;
}

// ---- Taking or releasing the held money --------------------------------------

// Takes the held money for a job. Safe against double clicks: only the call that
// moves the row from 'authorized' to 'capturing' talks to PayPal.
export async function capturePayment(proposalId) {
  const { rows } = await pool.query(
    `UPDATE job_payments SET status = 'capturing', updated_at = NOW()
     WHERE proposal_id = $1 AND status = 'authorized' RETURNING *`,
    [proposalId],
  );
  const p = rows[0];
  if (!p) throw new PaymentError("There's no held payment to take for this job. Refresh and try again.");
  try {
    const capture = await captureAuthorization(p.authorization_id, {
      sellerMerchantId: p.seller_merchant_id,
      platformFee: Number(p.platform_fee),
      currency: p.currency,
    });
    const b = capture.seller_receivable_breakdown ?? {};
    await pool.query(
      `UPDATE job_payments SET status = 'captured', capture_id = $2, gross_amount = $3, paypal_fee = $4,
              net_to_freelancer = $5, updated_at = NOW()
       WHERE id = $1`,
      [p.id, capture.id, b.gross_amount?.value ?? null, b.paypal_fee?.value ?? null, b.net_amount?.value ?? null],
    );
  } catch (err) {
    await pool.query(
      "UPDATE job_payments SET status = 'authorized', last_debug_id = $2, updated_at = NOW() WHERE id = $1",
      [p.id, err.debugId ?? null],
    );
    throw fromPayPal(err, "take the payment");
  }
}

// Releases the held money (nobody is charged). No-op when nothing is held.
export async function releasePayment(proposalId) {
  const { rows } = await pool.query(
    `UPDATE job_payments SET status = 'voiding', updated_at = NOW()
     WHERE proposal_id = $1 AND status = 'authorized' RETURNING *`,
    [proposalId],
  );
  const p = rows[0];
  if (!p) return;
  try {
    await voidAuthorization(p.authorization_id, p.seller_merchant_id);
    await pool.query("UPDATE job_payments SET status = 'voided', updated_at = NOW() WHERE id = $1", [p.id]);
  } catch (err) {
    await pool.query(
      "UPDATE job_payments SET status = 'authorized', last_debug_id = $2, updated_at = NOW() WHERE id = $1",
      [p.id, err.debugId ?? null],
    );
    throw fromPayPal(err, "release the payment");
  }
}

// Asks PayPal for the authorization's real state (expired, voided elsewhere...).
export async function refreshAuthorization(proposalId) {
  const { rows } = await pool.query(
    "SELECT id, authorization_id, seller_merchant_id FROM job_payments WHERE proposal_id = $1 AND status = 'authorized'",
    [proposalId],
  );
  const p = rows[0];
  if (!p) return null;
  const auth = await getAuthorization(p.authorization_id, p.seller_merchant_id);
  const status = { EXPIRED: "expired", VOIDED: "voided", CAPTURED: "captured", DENIED: "failed" }[auth.status];
  if (status) {
    await pool.query("UPDATE job_payments SET status = $2, updated_at = NOW() WHERE id = $1", [p.id, status]);
  }
  return auth.status;
}

// ---- Reads ----------------------------------------------------------------------

export async function getJobPayment(proposalId) {
  const { rows } = await pool.query("SELECT * FROM job_payments WHERE proposal_id = $1", [proposalId]);
  const p = rows[0];
  if (!p) return null;
  return {
    status: p.status,
    amount: money(p.amount),
    platformFee: money(p.platform_fee),
    currency: p.currency,
    expiresAt: p.expires_at,
    grossAmount: money(p.gross_amount),
    paypalFee: money(p.paypal_fee),
    netToFreelancer: money(p.net_to_freelancer),
    lastDebugId: p.last_debug_id,
  };
}

// Which payments a filter covers: one project, one proposal, or everything a user
// is part of (as client or freelancer).
const SCOPE = `($1::int IS NULL OR pr.project_id = $1) AND ($2::int IS NULL OR pr.id = $2)
  AND ($3::int IS NULL OR pr.freelancer_id = $3 OR pr.project_id IN (SELECT id FROM projects WHERE client_id = $3))`;
const scopeArgs = ({ projectId, proposalId, userId }) => [projectId ?? null, proposalId ?? null, userId ?? null];

// Payments that keep a project, proposal or account from being deleted: money held or taken
// (refunded PayPal payments too: their history is kept), with PayPal or USDC on Arc.
export async function hasLivePayment(scope) {
  const { rows } = await pool.query(
    `SELECT 1 FROM job_payments jp JOIN proposals pr ON pr.id = jp.proposal_id
     WHERE jp.status IN ('authorized', 'capturing', 'voiding', 'captured', 'partially_refunded', 'refunded') AND ${SCOPE}
     UNION ALL
     SELECT 1 FROM job_arc_payments ja JOIN proposals pr ON pr.id = ja.proposal_id
     WHERE ja.status IN ('funded', 'releasing', 'released', 'refunding') AND ${SCOPE}
     LIMIT 1`,
    scopeArgs(scope),
  );
  return rows.length > 0;
}

// Leftover rows of payments that never held money (abandoned, voided, failed, refunded
// on Arc), so the proposal, project or account can be deleted.
export async function clearDeadPayments(scope) {
  await pool.query(
    `DELETE FROM job_payments jp USING proposals pr
     WHERE pr.id = jp.proposal_id AND jp.status IN ('created', 'voided', 'expired', 'failed') AND ${SCOPE}`,
    scopeArgs(scope),
  );
  await pool.query(
    `DELETE FROM job_arc_payments ja USING proposals pr
     WHERE pr.id = ja.proposal_id AND ja.status IN ('signed', 'refunded') AND ${SCOPE}`,
    scopeArgs(scope),
  );
}

// ---- Webhooks -------------------------------------------------------------------

// Keeps our rows in line with what happened on PayPal's side. Our own calls already
// update them; this catches the rest (expiry, voids or refunds made in PayPal...).
// Returns the proposal id when a hold was voided that ShortWorks didn't release itself:
// the caller cancels that job (lib/jobs.js cancelJobForLostPayment).
export async function applyWebhookEvent(event) {
  const r = event.resource ?? {};
  const authId = r.supplementary_data?.related_ids?.authorization_id;
  switch (event.event_type) {
    case "PAYMENT.AUTHORIZATION.VOIDED": {
      // 'voiding' = our own release in progress; 'authorized' = voided by someone else.
      const { rows } = await pool.query(
        `UPDATE job_payments jp SET status = 'voided', updated_at = NOW()
         FROM (SELECT id, status FROM job_payments WHERE authorization_id = $1) old
         WHERE jp.id = old.id AND jp.status IN ('authorized', 'voiding')
         RETURNING jp.proposal_id, old.status AS old_status`,
        [r.id],
      );
      return rows[0]?.old_status === "authorized" ? rows[0].proposal_id : null;
    }
    case "PAYMENT.CAPTURE.REFUNDED": {
      // The resource is the refund; its "up" link is the capture. The capture's own status
      // says whether it is now fully or partly refunded (several refunds add up).
      const captureId = r.links?.find((l) => l.rel === "up")?.href?.split("/").pop();
      const { rows } = await pool.query(
        "SELECT id, seller_merchant_id FROM job_payments WHERE capture_id = $1",
        [captureId ?? null],
      );
      if (!rows[0]) break;
      const capture = await getCapture(captureId, rows[0].seller_merchant_id);
      const status = { REFUNDED: "refunded", PARTIALLY_REFUNDED: "partially_refunded" }[capture.status];
      if (status) {
        await pool.query("UPDATE job_payments SET status = $2, updated_at = NOW() WHERE id = $1", [rows[0].id, status]);
      }
      break;
    }
    case "PAYMENT.CAPTURE.COMPLETED":
      if (authId) {
        await pool.query(
          `UPDATE job_payments SET status = 'captured', capture_id = COALESCE(capture_id, $2), updated_at = NOW()
           WHERE authorization_id = $1 AND status IN ('authorized', 'capturing')`,
          [authId, r.id],
        );
      }
      break;
    case "PAYMENT.CAPTURE.DENIED":
      if (authId) {
        await pool.query("UPDATE job_payments SET status = 'failed', updated_at = NOW() WHERE authorization_id = $1", [authId]);
      }
      break;
    case "MERCHANT.ONBOARDING.COMPLETED":
    case "MERCHANT.PARTNER-CONSENT.REVOKED": {
      const userId = r.tracking_id ? await findUserByTrackingId(r.tracking_id) : null;
      if (userId && event.event_type === "MERCHANT.PARTNER-CONSENT.REVOKED") {
        await pool.query("UPDATE users SET paypal_status = 'not_connected', paypal_merchant_id = NULL WHERE id = $1", [userId]);
      } else if (userId) {
        await syncPaypalAccount(userId);
      }
      break;
    }
    default:
      break;
  }
  return null;
}
