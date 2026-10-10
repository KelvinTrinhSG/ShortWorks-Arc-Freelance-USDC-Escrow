import {
  deleteProject,
  getProjectOwner,
  setProjectStatus,
  updateProject,
  validateProject,
} from "@/lib/projects";
import { getViewer } from "@/lib/viewer";

const todayUtc = () => new Date().toISOString().slice(0, 10);

// Loads the project and checks the viewer owns it. Returns { project } or { response }.
async function ownProject(params) {
  const viewer = await getViewer();
  if (!viewer) {
    return { response: Response.json({ error: "Please log in again." }, { status: 401 }) };
  }
  const { id } = await params;
  const project = await getProjectOwner(id);
  if (!project) {
    return { response: Response.json({ error: "Project not found." }, { status: 404 }) };
  }
  if (project.client_id !== viewer.id) {
    return { response: Response.json({ error: "This is not your project." }, { status: 403 }) };
  }
  return { project };
}

// Body is either { status: "open" | "closed" } to close / reopen,
// or the full project (same shape as POST /api/projects) to edit it.
export async function PATCH(request, { params }) {
  const { project, response } = await ownProject(params);
  if (response) return response;
  const body = await request.json().catch(() => null);

  if (body && "status" in body && Object.keys(body).length === 1) {
    if (!["open", "closed"].includes(body.status)) {
      return Response.json({ error: "Invalid status." }, { status: 400 });
    }
    if (body.status === "open" && project.deadline < todayUtc()) {
      return Response.json(
        { error: "The deadline has passed. Edit the project to set a new deadline first." },
        { status: 409 },
      );
    }
    await setProjectStatus(project.id, body.status);
    return Response.json({ ok: true, status: body.status });
  }

  const { data, error } = validateProject(body);
  if (error) return Response.json({ error }, { status: 400 });
  await updateProject(project.id, data);
  return Response.json({ id: project.id });
}

export async function DELETE(_request, { params }) {
  const { project, response } = await ownProject(params);
  if (response) return response;
  await deleteProject(project.id);
  return Response.json({ ok: true });
}
