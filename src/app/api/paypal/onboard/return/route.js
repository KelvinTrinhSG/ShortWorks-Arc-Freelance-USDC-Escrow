import { findUserByTrackingId, syncPaypalAccount } from "@/lib/payments";

// PayPal sends the freelancer back here after connecting, with
//   merchantId          = the tracking id we sent
//   merchantIdInPayPal  = their PayPal merchant id (not trusted: we ask PayPal by tracking id)
// It often doesn't (the popup stops on PayPal's last page), so the profile page also polls.
export async function GET(request) {
  const url = request.nextUrl;
  const trackingId = url.searchParams.get("merchantId");
  const done = (params) =>
    Response.redirect(new URL(`/paypal-connected?${new URLSearchParams(params)}`, url.origin), 303);

  const userId = trackingId ? await findUserByTrackingId(trackingId) : null;
  if (!userId) return done({ error: "This PayPal link is not valid any more." });
  try {
    const account = await syncPaypalAccount(userId);
    return done({ status: account?.status ?? "pending" });
  } catch (err) {
    return done({ error: err.message });
  }
}
