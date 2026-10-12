import { completeArcCheckout, startArcCheckout } from "@/lib/arcPayments";
import { PaymentError } from "@/lib/payments";
import { getViewer } from "@/lib/viewer";

// Hire & pay with USDC on Arc (project owner only, docs/arc-payments.md §3):
// POST { wallet }   -> terms signed by ShortWorks + what's needed for the USDC permit
// POST { txHash }   -> after fundWithPermit was sent: read it from the chain, then hire
export async function POST(request, { params }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Please log in again." }, { status: 401 });
  const { id } = await params;
  const { wallet, txHash } = (await request.json().catch(() => null)) ?? {};
  try {
    if (txHash) {
      await completeArcCheckout(id, txHash, viewer);
      return Response.json({ ok: true, jobId: Number(id) });
    }
    return Response.json(await startArcCheckout(id, viewer, wallet));
  } catch (err) {
    if (err instanceof PaymentError) return Response.json({ error: err.message }, { status: err.code });
    throw err;
  }
}
