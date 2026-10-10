import { createProposal, getProject, validateProposal } from "@/lib/projects";
import { getViewer } from "@/lib/viewer";

// Send a proposal. Freelancer accounts only, one per project, while it is open.
export async function POST(request, { params }) {
  const viewer = await getViewer();
  if (!viewer) {
    return Response.json({ error: "Please log in to send a proposal." }, { status: 401 });
  }
  if (viewer.accountType !== "freelancer") {
    return Response.json(
      { error: "Only freelancer accounts can send proposals." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const found = await getProject(id, viewer);
  if (!found) return Response.json({ error: "Project not found." }, { status: 404 });
  if (found.isOwner) {
    return Response.json({ error: "You cannot apply to your own project." }, { status: 403 });
  }
  if (!found.project.isOpen) {
    return Response.json({ error: "This project is no longer accepting proposals." }, { status: 409 });
  }
  if (found.myProposal) {
    return Response.json({ error: "You already sent a proposal for this project." }, { status: 409 });
  }

  const { data, error } = validateProposal(
    await request.json().catch(() => null),
    found.project,
  );
  if (error) return Response.json({ error }, { status: 400 });

  try {
    const proposalId = await createProposal(found.project.id, viewer.id, data);
    return Response.json({ id: proposalId }, { status: 201 });
  } catch (err) {
    // 23505: a second request raced past the check above.
    if (err.code === "23505") {
      return Response.json({ error: "You already sent a proposal for this project." }, { status: 409 });
    }
    throw err;
  }
}
