import {
  deleteProposal,
  getProposalContext,
  setProposalStatus,
  updateProposal,
  validateProposal,
} from "@/lib/projects";
import { canUndoAcceptance } from "@/lib/jobs";
import { getViewer } from "@/lib/viewer";

const error = (message, status) => Response.json({ error: message }, { status });

async function load(params) {
  const viewer = await getViewer();
  if (!viewer) return { response: error("Please log in again.", 401) };
  const { id } = await params;
  const proposal = await getProposalContext(id);
  if (!proposal) return { response: error("Proposal not found.", 404) };
  return { viewer, proposal };
}

// Two callers, told apart by who is logged in:
// - the project's client sends { status: "accepted" | "declined" | "pending" }
// - the freelancer who wrote it sends the edited fields (same as when sending)
export async function PATCH(request, { params }) {
  const { viewer, proposal, response } = await load(params);
  if (response) return response;
  const body = (await request.json().catch(() => null)) ?? {};

  if (viewer.id === proposal.project.clientId) {
    if (!["accepted", "declined", "pending"].includes(body.status)) {
      return error("Invalid status.", 400);
    }
    // Once work was handed in (or disputed), the job can't be undone from here.
    if (proposal.status === "accepted" && body.status !== "accepted" && !(await canUndoAcceptance(proposal.id))) {
      return error("Work on this job has already started, so the hire can't be undone.", 409);
    }
    await setProposalStatus(proposal.id, body.status);
    return Response.json({ ok: true, status: body.status });
  }

  if (viewer.id === proposal.freelancerId) {
    if (proposal.status !== "pending") {
      return error("The client already responded, so this proposal can no longer be edited.", 409);
    }
    if (!proposal.project.isOpen) {
      return error("This project is no longer accepting proposals.", 409);
    }
    const { data, error: message } = validateProposal(body, proposal.project);
    if (message) return error(message, 400);
    await updateProposal(proposal.id, data);
    return Response.json({ ok: true });
  }

  return error("This is not your proposal.", 403);
}

// Withdraw: the freelancer removes their pending proposal (and may apply again).
export async function DELETE(_request, { params }) {
  const { viewer, proposal, response } = await load(params);
  if (response) return response;
  if (viewer.id !== proposal.freelancerId) return error("This is not your proposal.", 403);
  if (proposal.status !== "pending") {
    return error("The client already responded, so this proposal can no longer be withdrawn.", 409);
  }
  await deleteProposal(proposal.id);
  return Response.json({ ok: true });
}
