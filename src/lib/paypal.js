import "server-only";

// PayPal REST calls for the Multiparty (Platform) integration, ported from the
// hackathon demo (docs/payments.md). The freelancer is the seller: every call about
// their money carries PayPal-Auth-Assertion, including creating the order — an order
// created without it can't be authorized with it (404 RESOURCE_NOT_FOUND).

const API_BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";

export class PayPalError extends Error {
  constructor(status, details) {
    super(details?.message ?? `PayPal API error (${status})`);
    this.status = status;
    this.details = details;
    this.debugId = details?.debug_id;
  }
}

let cachedToken = null; // { value, expiresAt }

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set");

  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new PayPalError(res.status, data);
  // Refresh a minute early.
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

// Unsigned JWT saying which seller the platform acts for.
const authAssertion = (sellerMerchantId) =>
  `${base64url({ alg: "none" })}.${base64url({ iss: process.env.PAYPAL_CLIENT_ID, payer_id: sellerMerchantId })}.`;

// `requestId` makes a POST idempotent: PayPal answers a repeat with the first result,
// so a double click or a retry can't authorize or capture twice. Pass a stable id.
async function paypalFetch(path, { method = "GET", body, sellerMerchantId, requestId, full = false } = {}) {
  const headers = {
    Authorization: `Bearer ${await getAccessToken()}`,
    "Content-Type": "application/json",
  };
  if (requestId) headers["PayPal-Request-Id"] = requestId;
  if (process.env.PAYPAL_BN_CODE) headers["PayPal-Partner-Attribution-Id"] = process.env.PAYPAL_BN_CODE;
  if (sellerMerchantId) headers["PayPal-Auth-Assertion"] = authAssertion(sellerMerchantId);
  // The default (minimal) answer leaves out the fee breakdown and expiration time.
  if (full) headers.Prefer = "return=representation";

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text(); // void answers 204 No Content
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new PayPalError(res.status, data);
  return data;
}

// ---- Seller onboarding --------------------------------------------------------

// Link the freelancer opens to connect their PayPal account. `trackingId` comes back
// on the return URL and lets us find the account again.
export async function createPartnerReferral(trackingId, returnUrl) {
  const data = await paypalFetch("/v2/customer/partner-referrals", {
    method: "POST",
    body: {
      tracking_id: trackingId,
      partner_config_override: { return_url: returnUrl },
      operations: [
        {
          operation: "API_INTEGRATION",
          api_integration_preference: {
            rest_api_integration: {
              integration_method: "PAYPAL",
              integration_type: "THIRD_PARTY",
              third_party_details: { features: ["PAYMENT", "REFUND", "PARTNER_FEE", "DELAY_FUNDS_DISBURSEMENT"] },
            },
          },
        },
      ],
      products: ["EXPRESS_CHECKOUT"],
      legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
    },
  });
  const url = data.links?.find((l) => l.rel === "action_url")?.href;
  if (!url) throw new PayPalError(502, { message: "PayPal did not return a sign-up link." });
  return url;
}

function partnerPath() {
  const partnerId = process.env.PAYPAL_PARTNER_MERCHANT_ID;
  if (!partnerId) throw new Error("PAYPAL_PARTNER_MERCHANT_ID is not set");
  return `/v1/customer/partners/${encodeURIComponent(partnerId)}/merchant-integrations`;
}

// { merchant_id, tracking_id, payments_receivable, primary_email_confirmed, primary_email }
export const getMerchantIntegration = (merchantId) =>
  paypalFetch(`${partnerPath()}/${encodeURIComponent(merchantId)}`);

// The seller's merchant id from the tracking id we sent, or null if they haven't finished.
// PayPal often doesn't send the browser back to the return URL, so this is how we find out.
export async function findMerchantIdByTrackingId(trackingId) {
  try {
    const data = await paypalFetch(`${partnerPath()}?tracking_id=${encodeURIComponent(trackingId)}`);
    return data.merchant_id ?? null;
  } catch (err) {
    if (err instanceof PayPalError && err.status === 404) return null;
    throw err;
  }
}

// ---- Payments -----------------------------------------------------------------

// Order paid to the freelancer, money only held (AUTHORIZE) until the client approves.
export function createOrder({ sellerMerchantId, amount, currency, referenceId, description, requestId }) {
  return paypalFetch("/v2/checkout/orders", {
    method: "POST",
    sellerMerchantId,
    requestId,
    body: {
      intent: "AUTHORIZE",
      purchase_units: [
        {
          reference_id: referenceId,
          description: description.slice(0, 127),
          amount: { currency_code: currency, value: amount.toFixed(2) },
          payee: { merchant_id: sellerMerchantId },
        },
      ],
    },
  });
}

// Returns the authorization ({ id, status, expiration_time, amount }).
export async function authorizeOrder(orderId, sellerMerchantId) {
  const order = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/authorize`, {
    method: "POST",
    body: {},
    sellerMerchantId,
    requestId: `sw-auth-${orderId}`,
    full: true,
  });
  const authorization = order.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!authorization) throw new PayPalError(502, { message: "PayPal did not return the authorization." });
  return { order, authorization };
}

// Takes the held money: the freelancer gets it minus `platformFee` (to ShortWorks) and PayPal's fee.
export function captureAuthorization(authorizationId, { sellerMerchantId, platformFee, currency }) {
  return paypalFetch(`/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/capture`, {
    method: "POST",
    sellerMerchantId,
    requestId: `sw-capture-${authorizationId}`,
    full: true,
    body: {
      final_capture: true,
      payment_instruction: {
        platform_fees: [{ amount: { currency_code: currency, value: platformFee.toFixed(2) } }],
      },
    },
  });
}

// Releases the held money; nobody is charged.
export const voidAuthorization = (authorizationId, sellerMerchantId) =>
  paypalFetch(`/v2/payments/authorizations/${encodeURIComponent(authorizationId)}/void`, {
    method: "POST",
    sellerMerchantId,
    requestId: `sw-void-${authorizationId}`,
  });

export const getAuthorization = (authorizationId, sellerMerchantId) =>
  paypalFetch(`/v2/payments/authorizations/${encodeURIComponent(authorizationId)}`, { sellerMerchantId });

// { id, status: COMPLETED | PARTIALLY_REFUNDED | REFUNDED | ..., amount }
export const getCapture = (captureId, sellerMerchantId) =>
  paypalFetch(`/v2/payments/captures/${encodeURIComponent(captureId)}`, { sellerMerchantId });

// ---- Webhooks -----------------------------------------------------------------

// Asks PayPal whether a webhook call really came from PayPal.
export async function verifyWebhook(headers, event) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const data = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: {
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    },
  });
  return data.verification_status === "SUCCESS";
}
