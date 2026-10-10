import { createInvitation, deleteInvitation, getFreelancerByUsername } from "@/lib/invitations";
import { getProject } from "@/lib/projects";
import { getViewer } from "@/lib/viewer";

// Shared checks: the viewer owns the project and the username is a freelancer.
async function load(request, params) {
  const viewer = await getViewer();
  if (!viewer) return { error: Response.json({ error: "Please log in." }, { status: 401 }) };

  const { id } = await params;
  const found = await getProject(id, viewer);
  if (!found) return { error: Response.json({ error: "Project not found." }, { status: 404 }) };
  if (!found.isOwner) {
    return { error: Response.json({ error: "Only the project owner can invite freelancers." }, { status: 403 }) };
  }

  const body = await request.json().catch(() => null);
  const freelancer = await getFreelancerByUsername(body?.username);
  if (!freelancer) return { error: Response.json({ error: "Freelancer not found." }, { status: 404 }) };

  return { project: found.project, freelancer };
}

// Invite a freelancer to send a proposal. Body: { username }
export async function POST(request, { params }) {
  const { error, project, freelancer } = await load(request, params);
  if (error) return error;
  if (!project.isOpen) {
    return Response.json({ error: "This project is no longer accepting proposals." }, { status: 409 });
  }
  // Only freelancers who marked themselves "Available for work" can be invited.
  if (freelancer.availability !== "available") {
    return Response.json({ error: "This freelancer is not available for work right now." }, { status: 409 });
  }
  await createInvitation(project.id, freelancer.id);
  return Response.json({ ok: true }, { status: 201 });
}

// Take an invitation back. Body: { username }
export async function DELETE(request, { params }) {
  const { error, project, freelancer } = await load(request, params);
  if (error) return error;
  await deleteInvitation(project.id, freelancer.id);
  return Response.json({ ok: true });
}
