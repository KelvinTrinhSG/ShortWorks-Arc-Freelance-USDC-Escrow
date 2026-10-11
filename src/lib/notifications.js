import "server-only";
import pool from "@/lib/db";
import { avatarUrlOf } from "@/lib/profile";

// Notifications are written next to the event that causes them (lib/projects.js,
// lib/invitations.js) and removed again when that event is undone, so the bell
// never shows something that is no longer true.

export const NOTIFICATIONS_LIMIT = 20;

// The client invited a freelancer.
export async function notifyInvited(projectId, freelancerId) {
  await pool.query(
    `INSERT INTO notifications (user_id, actor_id, type, project_id)
     SELECT $2, client_id, 'invited', id FROM projects WHERE id = $1`,
    [projectId, freelancerId],
  );
}

export async function removeInvitedNotice(projectId, freelancerId) {
  await pool.query(
    "DELETE FROM notifications WHERE type = 'invited' AND project_id = $1 AND user_id = $2",
    [projectId, freelancerId],
  );
}

// The owner cancelled an invitation: a "declined" notice about it no longer matters.
export async function removeDeclinedNotice(projectId, freelancerId) {
  await pool.query(
    "DELETE FROM notifications WHERE type = 'invitation_declined' AND project_id = $1 AND actor_id = $2",
    [projectId, freelancerId],
  );
}

// The freelancer declined: their "invited" notice is settled, the owner hears about it.
export async function notifyInvitationDeclined(projectId, freelancerId) {
  await removeInvitedNotice(projectId, freelancerId);
  await pool.query(
    `INSERT INTO notifications (user_id, actor_id, type, project_id)
     SELECT client_id, $2, 'invitation_declined', id FROM projects WHERE id = $1`,
    [projectId, freelancerId],
  );
}

// A freelancer sent a proposal: tell the project owner. Withdrawing the proposal
// deletes it, and this notice with it (proposal_id ON DELETE CASCADE).
export async function notifyProposalReceived(proposalId) {
  await pool.query(
    `INSERT INTO notifications (user_id, actor_id, type, project_id, proposal_id)
     SELECT p.client_id, pr.freelancer_id, 'proposal_received', p.id, pr.id
     FROM proposals pr JOIN projects p ON p.id = pr.project_id WHERE pr.id = $1`,
    [proposalId],
  );
}

// The client accepted, declined or undid (status back to "pending") a proposal.
// Any earlier decision notice for it is replaced.
export async function notifyProposalDecision(proposalId, status) {
  await pool.query(
    "DELETE FROM notifications WHERE proposal_id = $1 AND type IN ('proposal_accepted', 'proposal_declined')",
    [proposalId],
  );
  if (status !== "accepted" && status !== "declined") return;
  await pool.query(
    `INSERT INTO notifications (user_id, actor_id, type, project_id, proposal_id)
     SELECT pr.freelancer_id, p.client_id, $2, p.id, pr.id
     FROM proposals pr JOIN projects p ON p.id = pr.project_id WHERE pr.id = $1`,
    [proposalId, `proposal_${status}`],
  );
}

// Something happened on a job (lib/jobs.js): tell the other side.
// `event` is the job_events type; the notification type is "job_" + event.
export async function notifyJobEvent(job, recipientId, actorId, event) {
  await pool.query(
    `INSERT INTO notifications (user_id, actor_id, type, project_id, proposal_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [recipientId, actorId, `job_${event}`, job.project_id, job.id],
  );
}

// The held payment on a job expires soon (cron, lib/payments.js): tell both sides,
// once per job (the cron runs daily).
export async function notifyPaymentExpiring(proposalId) {
  await pool.query(
    `INSERT INTO notifications (user_id, actor_id, type, project_id, proposal_id)
     SELECT u.id, NULL, 'payment_expiring', p.id, pr.id
     FROM proposals pr JOIN projects p ON p.id = pr.project_id
     CROSS JOIN LATERAL (VALUES (pr.freelancer_id), (p.client_id)) AS u(id)
     WHERE pr.id = $1
       AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.proposal_id = pr.id AND n.type = 'payment_expiring')`,
    [proposalId],
  );
}

const jobHref = (r) => `/job-single/${r.proposal_id}`;

// What each type says and where it leads.
const MESSAGES = {
  job_submitted: (r) => ({ text: `submitted the videos for "${r.title}"`, href: jobHref(r) }),
  job_revision_requested: (r) => ({ text: `asked for changes on "${r.title}"`, href: jobHref(r) }),
  job_approved: (r) => ({ text: `approved your work on "${r.title}"`, href: jobHref(r) }),
  job_dispute_opened: (r) => ({ text: `opened a dispute on "${r.title}"`, href: jobHref(r) }),
  job_dispute_withdrawn: (r) => ({ text: `withdrew the dispute on "${r.title}"`, href: jobHref(r) }),
  // Sent by ShortWorks itself (no actor).
  job_auto_approved: (r) => ({ text: `approved "${r.title}" automatically after 3 days, and the freelancer was paid`, href: jobHref(r) }),
  job_dispute_resolved: (r) => ({ text: `decided the dispute on "${r.title}"`, href: jobHref(r) }),
  payment_expiring: (r) => ({ text: `reminds you: the payment held for "${r.title}" expires in less than 3 days`, href: jobHref(r) }),
  invited: (r) => ({
    text: `invited you to send a proposal for "${r.title}"`,
    href: `/project-single/${r.project_id}`,
  }),
  invitation_declined: (r) => ({
    text: `declined your invitation to "${r.title}"`,
    href: `/project-single/${r.project_id}`,
  }),
  proposal_received: (r) => ({
    text: `sent a proposal for "${r.title}"`,
    href: `/project-single/${r.project_id}`,
  }),
  // A hire. When the project came from a service order (projects.service_id), the
  // client ordered the service: there was no proposal from the freelancer's side.
  proposal_accepted: (r) => ({
    text: r.service_id
      ? `ordered ${r.video_count} ${r.video_count === 1 ? "video" : "videos"} from your service "${r.title}" and paid with PayPal. Time to start!`
      : `accepted your proposal for "${r.title}"`,
    href: jobHref(r),
  }),
  proposal_declined: (r) => ({
    text: `declined your proposal for "${r.title}"`,
    href: `/project-single/${r.project_id}`,
  }),
};

// The latest notifications for the bell, plus how many are unread in total.
export async function getNotifications(userId) {
  const [{ rows }, { rows: count }] = await Promise.all([
    pool.query(
      `SELECT n.id, n.type, n.project_id, n.proposal_id, n.created_at, n.read_at,
              p.title, p.service_id, p.video_count, a.id AS actor_id, a.display_name, a.avatar_updated_at
       FROM notifications n
       JOIN projects p ON p.id = n.project_id
       LEFT JOIN users a ON a.id = n.actor_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [userId, NOTIFICATIONS_LIMIT],
    ),
    pool.query(
      "SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND read_at IS NULL",
      [userId],
    ),
  ]);
  return {
    notifications: rows
      .filter((r) => MESSAGES[r.type])
      .map((r) => ({
        id: r.id,
        ...MESSAGES[r.type](r),
        actor: {
          // No actor = ShortWorks itself (auto-approval, dispute decision, reminders).
          displayName: r.actor_id ? r.display_name ?? "Someone" : "ShortWorks",
          avatarUrl: r.actor_id
            ? avatarUrlOf({ id: r.actor_id, avatar_updated_at: r.avatar_updated_at })
            : null,
        },
        createdAt: r.created_at,
        read: Boolean(r.read_at),
      })),
    unread: count[0].unread,
  };
}

export async function markAllRead(userId) {
  await pool.query(
    "UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL",
    [userId],
  );
}
