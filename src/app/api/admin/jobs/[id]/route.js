import { isAdmin } from "@/lib/admin";
import { resolveDispute } from "@/lib/jobs";
import { getViewer } from "@/lib/viewer";

// An admin settles a dispute: { decision: "pay" | "release", note }.
// pay = the freelancer gets the whole payment; release = the client is not charged.
export async function POST(request, { params }) {
  const viewer = await getViewer();
  if (!(await isAdmin(viewer))) return Response.json({ error: "Admins only." }, { status: 403 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) ?? {};
  const result = await resolveDispute(id, viewer.id, body.decision, body.note);
  if (result.error) return Response.json({ error: result.error }, { status: result.code });
  return Response.json({ ok: true, status: result.status });
}
