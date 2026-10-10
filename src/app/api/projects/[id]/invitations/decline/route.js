import { declineInvitation, getInvitationStatus } from "@/lib/invitations";
import { getProject } from "@/lib/projects";
import { getViewer } from "@/lib/viewer";

// The invited freelancer turns the invitation down. The project owner is notified.
export async function POST(request, { params }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Please log in." }, { status: 401 });

  const { id } = await params;
  const found = await getProject(id, viewer);
  if (!found) return Response.json({ error: "Project not found." }, { status: 404 });

  const status =
    viewer.accountType === "freelancer" ? await getInvitationStatus(found.project.id, viewer.id) : null;
  if (!status) {
    return Response.json({ error: "You were not invited to this project." }, { status: 403 });
  }
  if (status === "declined") {
    return Response.json({ error: "You already declined this invitation." }, { status: 409 });
  }
  if (found.myProposal) {
    return Response.json({ error: "You already sent a proposal for this project." }, { status: 409 });
  }

  await declineInvitation(found.project.id, viewer.id);
  return Response.json({ ok: true });
}
