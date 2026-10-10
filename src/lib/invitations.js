import "server-only";
import pool from "@/lib/db";
import {
  notifyInvitationDeclined,
  notifyInvited,
  removeDeclinedNotice,
  removeInvitedNotice,
} from "@/lib/notifications";
import { avatarUrlOf } from "@/lib/profile";

// A client invites a freelancer to send a proposal. The invitation has no status
// of its own: it counts as answered once that freelancer has a proposal on the project.

// The freelancer account behind a username, or null.
export async function getFreelancerByUsername(username) {
  if (typeof username !== "string" || !username) return null;
  const { rows } = await pool.query(
    "SELECT id, username, availability FROM users WHERE LOWER(username) = LOWER($1) AND account_type = 'freelancer'",
    [username],
  );
  return rows[0] ?? null;
}

// Inviting twice is not an error: the first invitation (and its notification) stays.
export async function createInvitation(projectId, freelancerId) {
  const { rowCount } = await pool.query(
    `INSERT INTO project_invitations (project_id, freelancer_id) VALUES ($1, $2)
     ON CONFLICT (project_id, freelancer_id) DO NOTHING`,
    [projectId, freelancerId],
  );
  if (rowCount) await notifyInvited(projectId, freelancerId);
}

export async function deleteInvitation(projectId, freelancerId) {
  await pool.query(
    "DELETE FROM project_invitations WHERE project_id = $1 AND freelancer_id = $2",
    [projectId, freelancerId],
  );
  await removeInvitedNotice(projectId, freelancerId);
  await removeDeclinedNotice(projectId, freelancerId);
}

// The freelancer turns the invitation down. Returns false if there was nothing to decline.
export async function declineInvitation(projectId, freelancerId) {
  const { rowCount } = await pool.query(
    `UPDATE project_invitations SET declined_at = NOW()
     WHERE project_id = $1 AND freelancer_id = $2 AND declined_at IS NULL`,
    [projectId, freelancerId],
  );
  if (rowCount) await notifyInvitationDeclined(projectId, freelancerId);
  return rowCount > 0;
}

// Everyone invited to a project, for its owner. `proposed` = they already sent a proposal.
export async function getProjectInvitations(projectId) {
  const { rows } = await pool.query(
    `SELECT i.created_at, i.declined_at, u.id, u.username, u.display_name, u.headline, u.avatar_updated_at,
            EXISTS (SELECT 1 FROM proposals pr
                    WHERE pr.project_id = i.project_id AND pr.freelancer_id = i.freelancer_id) AS proposed
     FROM project_invitations i JOIN users u ON u.id = i.freelancer_id
     WHERE i.project_id = $1
     ORDER BY i.created_at DESC`,
    [projectId],
  );
  return rows.map((r) => ({
    username: r.username,
    displayName: r.display_name,
    headline: r.headline ?? "",
    avatarUrl: avatarUrlOf(r),
    invitedAt: r.created_at,
    declinedAt: r.declined_at,
    proposed: r.proposed,
  }));
}

// The client's open projects, each with where this freelancer stands on it:
// "proposed" | "declined" | "invited" | null. For the Invite box on a talent profile.
export async function getInviteOptions(clientId, freelancerId) {
  const { rows } = await pool.query(
    `SELECT p.id, p.title,
            EXISTS (SELECT 1 FROM proposals pr WHERE pr.project_id = p.id AND pr.freelancer_id = $2) AS proposed,
            i.id IS NOT NULL AS invited, i.declined_at
     FROM projects p
     LEFT JOIN project_invitations i ON i.project_id = p.id AND i.freelancer_id = $2
     WHERE p.client_id = $1
       AND p.status = 'open'
       AND p.deadline >= CURRENT_DATE
       AND NOT EXISTS (SELECT 1 FROM proposals a WHERE a.project_id = p.id AND a.status = 'accepted')
     ORDER BY p.created_at DESC`,
    [clientId, freelancerId],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.proposed ? "proposed" : r.declined_at ? "declined" : r.invited ? "invited" : null,
  }));
}

// This freelancer's invitation to the project: "invited", "declined", or null if none.
export async function getInvitationStatus(projectId, freelancerId) {
  const { rows } = await pool.query(
    "SELECT declined_at FROM project_invitations WHERE project_id = $1 AND freelancer_id = $2",
    [projectId, freelancerId],
  );
  if (!rows[0]) return null;
  return rows[0].declined_at ? "declined" : "invited";
}

// The freelancer's invitations for /invitations, newest first.
export async function getFreelancerInvitations(freelancerId) {
  const { rows } = await pool.query(
    `SELECT i.created_at AS invited_at, i.declined_at, p.id, p.title, p.video_count, p.video_length,
            p.budget_per_video, to_char(p.deadline, 'YYYY-MM-DD') AS deadline, p.status,
            c.display_name AS client_name,
            EXISTS (SELECT 1 FROM proposals pr
                    WHERE pr.project_id = p.id AND pr.freelancer_id = i.freelancer_id) AS proposed,
            EXISTS (SELECT 1 FROM proposals pr
                    WHERE pr.project_id = p.id AND pr.status = 'accepted') AS hired
     FROM project_invitations i
     JOIN projects p ON p.id = i.project_id
     JOIN users c ON c.id = p.client_id
     WHERE i.freelancer_id = $1
     ORDER BY i.created_at DESC`,
    [freelancerId],
  );
  return rows.map((r) => ({
    projectId: r.id,
    title: r.title,
    clientName: r.client_name,
    videoCount: r.video_count,
    videoLength: r.video_length,
    budgetPerVideo: Number(r.budget_per_video),
    deadline: r.deadline,
    invitedAt: r.invited_at,
    declined: Boolean(r.declined_at),
    proposed: r.proposed,
    // Same rule as toProject().isOpen in lib/projects.js.
    isOpen: r.status === "open" && r.deadline >= new Date().toISOString().slice(0, 10) && !r.hired,
  }));
}
