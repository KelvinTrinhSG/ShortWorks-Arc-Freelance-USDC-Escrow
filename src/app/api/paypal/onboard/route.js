import { PaymentError, startOnboarding } from "@/lib/payments";
import { getViewer } from "@/lib/viewer";

// A freelancer starts connecting their PayPal account: returns the PayPal page to open.
export async function POST(request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Please log in again." }, { status: 401 });
  if (viewer.accountType !== "freelancer") {
    return Response.json({ error: "Only freelancer accounts get paid through PayPal." }, { status: 403 });
  }
  const base = process.env.APP_BASE_URL || request.nextUrl.origin;
  try {
    const actionUrl = await startOnboarding(viewer.id, `${base}/api/paypal/onboard/return`);
    return Response.json({ actionUrl });
  } catch (err) {
    if (err instanceof PaymentError) return Response.json({ error: err.message }, { status: err.code });
    throw err;
  }
}
