import "server-only";
import pool from "@/lib/db";
import { getProject, getProposalContext } from "@/lib/projects";

// A "job" is a freelancer's accepted proposal. Its id is the proposal id.

// The freelancer's jobs for /manage-jobs, soonest delivery first.
export async function getFreelancerJobs(freelancerId) {
  const { rows } = await pool.query(
    `SELECT pr.id, pr.price_per_video, to_char(pr.delivery_date, 'YYYY-MM-DD') AS delivery_date,
            pr.accepted_at, p.id AS project_id, p.title, p.video_count, p.video_length,
            to_char(p.deadline, 'YYYY-MM-DD') AS deadline,
            c.display_name AS client_name
     FROM proposals pr
     JOIN projects p ON p.id = pr.project_id
     JOIN users c ON c.id = p.client_id
     WHERE pr.freelancer_id = $1 AND pr.status = 'accepted'
     ORDER BY pr.delivery_date ASC, pr.id`,
    [freelancerId],
  );
  return rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    clientName: r.client_name,
    videoCount: r.video_count,
    videoLength: r.video_length,
    pricePerVideo: Number(r.price_per_video),
    total: Math.round(Number(r.price_per_video) * r.video_count * 100) / 100,
    deliveryDate: r.delivery_date,
    deadline: r.deadline,
    acceptedAt: r.accepted_at,
  }));
}

// One job (project + the accepted proposal), only for the freelancer who owns it.
// Returns null otherwise, including when the client has since undone the acceptance.
export async function getJob(id, viewer) {
  if (viewer?.accountType !== "freelancer") return null;
  const context = await getProposalContext(id);
  if (!context || context.freelancerId !== viewer.id || context.status !== "accepted") {
    return null;
  }
  const data = await getProject(context.project.id, viewer);
  if (!data?.myProposal) return null;
  return { project: data.project, proposal: data.myProposal };
}
