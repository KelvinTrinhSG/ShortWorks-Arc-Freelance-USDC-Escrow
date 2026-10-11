import { PaymentError, getPaypalAccount, syncPaypalAccount } from "@/lib/payments";
import { getViewer } from "@/lib/viewer";

// The saved connection status (no call to PayPal), for the profile page.
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Please log in again." }, { status: 401 });
  return Response.json(await getPaypalAccount(viewer.id));
}

// The freelancer's PayPal connection, checked again with PayPal.
// Polled by the profile page while the PayPal window is open.
export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Please log in again." }, { status: 401 });
  try {
    return Response.json(await syncPaypalAccount(viewer.id));
  } catch (err) {
    if (err instanceof PaymentError) return Response.json({ error: err.message }, { status: err.code });
    throw err;
  }
}
