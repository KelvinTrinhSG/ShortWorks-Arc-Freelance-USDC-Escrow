import { SERVICE_STATUSES } from "@/data/serviceOptions";
import { deleteService, getServiceOwner, saveService, setServiceStatus, validateService } from "@/lib/services";
import { getViewer } from "@/lib/viewer";

const error = (message, status) => Response.json({ error: message }, { status });

async function ownService(params) {
  const viewer = await getViewer();
  if (!viewer) return { response: error("Please log in again.", 401) };
  const { id } = await params;
  const service = await getServiceOwner(id);
  if (!service) return { response: error("Service not found.", 404) };
  if (service.freelancer_id !== viewer.id) return { response: error("This is not your service.", 403) };
  return { viewer, service };
}

// Owner only. { status: "active" | "paused" } pauses or resumes it; the full set of
// fields (same as when creating) edits it.
export async function PATCH(request, { params }) {
  const { viewer, service, response } = await ownService(params);
  if (response) return response;
  const body = (await request.json().catch(() => null)) ?? {};

  if (Object.keys(body).length === 1 && "status" in body) {
    if (!SERVICE_STATUSES.some((s) => s.value === body.status)) return error("Invalid status.", 400);
    await setServiceStatus(service.id, body.status);
    return Response.json({ ok: true, status: body.status });
  }
  const { data, error: message } = validateService(body);
  if (message) return error(message, 400);
  await saveService(viewer.id, data, service.id);
  return Response.json({ id: service.id });
}

// Owner only. Orders already made stay as projects/jobs.
export async function DELETE(_request, { params }) {
  const { service, response } = await ownService(params);
  if (response) return response;
  await deleteService(service.id);
  return Response.json({ ok: true });
}
