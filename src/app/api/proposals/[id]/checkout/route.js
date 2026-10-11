import { PaymentError, completeCheckout, startCheckout } from "@/lib/payments";
import { getViewer } from "@/lib/viewer";

// Hire & pay, called by the PayPal button on the project page (project owner only):
// POST {}            -> create the order paid to the freelancer   -> { orderId }
// POST { orderId }   -> after the client approved in PayPal: hold the money and hire
export async function POST(request, { params }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Please log in again." }, { status: 401 });
  const { id } = await params;
  const { orderId } = (await request.json().catch(() => null)) ?? {};
  try {
    if (typeof orderId === "string" && orderId) {
      await completeCheckout(id, orderId, viewer);
      return Response.json({ ok: true, jobId: Number(id) });
    }
    return Response.json(await startCheckout(id, viewer));
  } catch (err) {
    if (err instanceof PaymentError) return Response.json({ error: err.message }, { status: err.code });
    throw err;
  }
}
