import { runJobAction } from "@/lib/jobs";
import { getViewer } from "@/lib/viewer";

// One step on a job, by the hired freelancer or the client (docs/jobs.md):
// { action: "submit", links: [...], note }      freelancer, in_progress -> submitted
// { action: "revision", note }                  client, submitted -> in_progress
// { action: "approve", note? }                  client, submitted -> completed
// { action: "dispute", reason, note }           either, in_progress | submitted -> disputed
// { action: "withdraw_dispute" }                whoever opened it, back to where it was
export async function POST(request, { params }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Please log in again." }, { status: 401 });
  const { id } = await params;
  const body = (await request.json().catch(() => null)) ?? {};
  const result = await runJobAction(id, viewer, body);
  if (result.error) return Response.json({ error: result.error }, { status: result.code });
  return Response.json({ ok: true, status: result.status });
}
