import { getArcWallet, saveArcWallet, unlinkArcWallet } from "@/lib/arcPayments";
import { PaymentError } from "@/lib/payments";
import { getViewer } from "@/lib/viewer";

// The wallet saved on the account (docs/arc-payments.md §4); for freelancers, where Arc jobs pay out.
// GET               -> { wallet }
// POST { address }  -> saved (connected with MetaMask or typed in), { wallet }
// DELETE            -> removed (jobs already funded still pay the old wallet)
const handle = async (fn) => {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Please log in again." }, { status: 401 });
  try {
    return Response.json(await fn(viewer));
  } catch (err) {
    if (err instanceof PaymentError) return Response.json({ error: err.message }, { status: err.code });
    throw err;
  }
};

export const GET = () => handle(async (viewer) => ({ wallet: await getArcWallet(viewer.id) }));

export async function POST(request) {
  const body = (await request.json().catch(() => null)) ?? {};
  return handle(async (viewer) => ({ wallet: await saveArcWallet(viewer.id, body.address) }));
}

export const DELETE = () =>
  handle(async (viewer) => {
    await unlinkArcWallet(viewer.id);
    return { wallet: null };
  });
