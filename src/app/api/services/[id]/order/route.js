import { OrderError, createServiceOrder } from "@/lib/services";
import { getViewer } from "@/lib/viewer";

// Step 1 of ordering a service (client): { videoCount, brief } -> the private project and
// the freelancer's proposal. Step 2 is paying it with POST /api/proposals/{proposalId}/checkout.
export async function POST(request, { params }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Please log in to order." }, { status: 401 });
  const { id } = await params;
  try {
    const order = await createServiceOrder(id, viewer, await request.json().catch(() => null));
    return Response.json(order, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) return Response.json({ error: err.message }, { status: err.code });
    throw err;
  }
}
