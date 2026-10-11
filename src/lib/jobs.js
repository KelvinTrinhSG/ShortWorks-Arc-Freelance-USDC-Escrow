import "server-only";
import {
  DISPUTE_REASONS,
  JOB_NOTE_MAX,
  JOB_STATUSES,
  PROJECTS_PAGE_SIZE,
  VIDEO_LENGTHS,
  WORK_TYPES,
} from "@/data/projectOptions";
import { COUNTRIES, PLATFORMS } from "@/data/talentOptions";
import pool from "@/lib/db";
import { notifyJobEvent } from "@/lib/notifications";
import { avatarUrlOf } from "@/lib/profile";
import { getProject } from "@/lib/projects";
import { parseVideoUrl } from "@/lib/videoUrl";

// A "job" is a freelancer's accepted proposal. Its id is the proposal id.
// Status (proposals.job_status): in_progress -> submitted -> completed, and
// disputed on the side. A revision request sends a submitted job back to in_progress.

const known = (options, list) => list.filter((v) => options.some((o) => o.value === v));
const todayUtc = () => new Date().toISOString().slice(0, 10);
const money = (n) => Math.round(n * 100) / 100;

// `today()` returns the SQL for UTC today. Every sort puts completed jobs last.
// Priority (default): what needs attention first, then the nearest delivery date.
export const JOB_SORTS = {
  priority: (today) => `
    CASE
      WHEN pr.job_status = 'disputed' THEN 0
      WHEN pr.job_status = 'in_progress' AND pr.delivery_date < ${today()} THEN 1
      WHEN pr.job_status = 'submitted' THEN 2
      WHEN pr.job_status = 'in_progress' THEN 3
      ELSE 4
    END,
    CASE WHEN pr.job_status = 'completed' THEN NULL ELSE pr.delivery_date END ASC,
    pr.completed_at DESC, pr.id`,
  newest: () => "pr.job_status = 'completed', pr.accepted_at DESC NULLS LAST, pr.id DESC",
  "total-desc": () => "pr.job_status = 'completed', (pr.price_per_video * p.video_count) DESC, pr.id",
};

export function parseJobFilters(params) {
  const list = (key) => (params.get(key) || "").split(",").map((s) => s.trim()).filter(Boolean);
  const minPrice = Number(params.get("minPrice"));
  const page = Math.floor(Number(params.get("page")));
  return {
    q: (params.get("q") || "").trim().slice(0, 100),
    platforms: known(PLATFORMS, list("platform")),
    workTypes: known(WORK_TYPES, list("workType")),
    lengths: known(VIDEO_LENGTHS, list("length")),
    statuses: known(JOB_STATUSES, list("status")),
    minPrice: Number.isFinite(minPrice) && minPrice > 0 ? minPrice : null,
    sort: params.get("sort") in JOB_SORTS ? params.get("sort") : "priority",
    page: page > 0 ? page : 1,
  };
}

// The viewer's jobs for /job-1: a freelancer sees the jobs they were hired for,
// a client sees the freelancers they hired on their projects (one entry per accepted proposal).
export async function searchJobs(f, viewer) {
  const where = ["pr.status = 'accepted'"];
  const args = [viewer.id];
  where.push(viewer.accountType === "client" ? "p.client_id = $1" : "pr.freelancer_id = $1");
  const add = (sql, value) => {
    args.push(value);
    where.push(sql.replaceAll("?", `$${args.length}`));
  };
  if (f.q) add("(p.title ILIKE ? OR p.brief ILIKE ?)", `%${f.q.replace(/[\\%_]/g, "\\$&")}%`);
  if (f.platforms.length) add("p.platforms && ?::text[]", f.platforms);
  if (f.workTypes.length) add("p.work_type = ANY(?::text[])", f.workTypes);
  if (f.lengths.length) add("p.video_length = ANY(?::text[])", f.lengths);
  if (f.minPrice) add("pr.price_per_video >= ?", f.minPrice);
  // UTC today, the same calendar the cards use: splits in-progress jobs into on time / overdue.
  // Added only when used: Postgres rejects a parameter nothing refers to.
  let todayParam = null;
  const today = () => {
    if (!todayParam) {
      args.push(todayUtc());
      todayParam = `$${args.length}::date`;
    }
    return todayParam;
  };
  if (f.statuses.length) {
    // The other statuses are stored as is.
    const SQL = {
      in_progress: () => `(pr.job_status = 'in_progress' AND pr.delivery_date >= ${today()})`,
      overdue: () => `(pr.job_status = 'in_progress' AND pr.delivery_date < ${today()})`,
    };
    where.push(`(${f.statuses.map((s) => SQL[s]?.() ?? `pr.job_status = '${s}'`).join(" OR ")})`);
  }
  // Before LIMIT/OFFSET, which must stay the last two parameters.
  const orderBy = JOB_SORTS[f.sort](today);

  args.push(PROJECTS_PAGE_SIZE, (f.page - 1) * PROJECTS_PAGE_SIZE);
  const { rows } = await pool.query(
    `SELECT pr.id, pr.price_per_video, to_char(pr.delivery_date, 'YYYY-MM-DD') AS delivery_date,
            pr.accepted_at, pr.job_status, p.id AS project_id, p.title, p.platforms, p.work_type,
            p.video_count, p.video_length, to_char(p.deadline, 'YYYY-MM-DD') AS deadline,
            c.display_name AS client_name,
            fr.username AS freelancer_username, fr.display_name AS freelancer_name,
            COUNT(*) OVER() AS total
     FROM proposals pr
     JOIN projects p ON p.id = pr.project_id
     JOIN users c ON c.id = p.client_id
     JOIN users fr ON fr.id = pr.freelancer_id
     WHERE ${where.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT $${args.length - 1} OFFSET $${args.length}`,
    args,
  );
  return {
    jobs: rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      title: r.title,
      platforms: r.platforms,
      workType: r.work_type,
      videoCount: r.video_count,
      videoLength: r.video_length,
      pricePerVideo: Number(r.price_per_video),
      total: money(Number(r.price_per_video) * r.video_count),
      deliveryDate: r.delivery_date,
      deadline: r.deadline,
      acceptedAt: r.accepted_at,
      jobStatus: r.job_status,
      clientName: r.client_name,
      freelancer: { username: r.freelancer_username, displayName: r.freelancer_name },
    })),
    total: rows[0] ? Number(rows[0].total) : 0,
    page: f.page,
    pageSize: PROJECTS_PAGE_SIZE,
  };
}

// The freelancer's jobs for /manage-jobs, soonest delivery first.
export async function getFreelancerJobs(freelancerId) {
  const { rows } = await pool.query(
    `SELECT pr.id, pr.price_per_video, to_char(pr.delivery_date, 'YYYY-MM-DD') AS delivery_date,
            pr.accepted_at, pr.job_status, p.id AS project_id, p.title, p.video_count, p.video_length,
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
    total: money(Number(r.price_per_video) * r.video_count),
    deliveryDate: r.delivery_date,
    deadline: r.deadline,
    acceptedAt: r.accepted_at,
    jobStatus: r.job_status,
  }));
}

// ---- One job ----------------------------------------------------------------

// The accepted proposal plus who may act on it, or null.
async function getJobContext(id) {
  if (!/^\d+$/.test(String(id))) return null;
  const { rows } = await pool.query(
    `SELECT pr.id, pr.freelancer_id, pr.job_status, pr.status_before_dispute,
            p.id AS project_id, p.client_id, p.video_count
     FROM proposals pr JOIN projects p ON p.id = pr.project_id
     WHERE pr.id = $1 AND pr.status = 'accepted'`,
    [id],
  );
  return rows[0] ?? null;
}

const roleOf = (ctx, viewer) =>
  viewer?.id === ctx.client_id ? "client" : viewer?.id === ctx.freelancer_id ? "freelancer" : null;

// /job-single/{id}: the project, the accepted proposal, the freelancer and the activity log.
// Only the client who hired and the hired freelancer may see it; null for everyone else.
export async function getJob(id, viewer) {
  const ctx = await getJobContext(id);
  if (!ctx) return null;
  const role = roleOf(ctx, viewer);
  if (!role) return null;

  // Public project fields + reference videos (no proposals: the job carries its own).
  const { project } = await getProject(ctx.project_id, null);
  const [{ rows: pr }, { rows: events }] = await Promise.all([
    pool.query(
      `SELECT pr.price_per_video, to_char(pr.delivery_date, 'YYYY-MM-DD') AS delivery_date,
              pr.cover_letter, pr.sample_url, pr.created_at, pr.accepted_at, pr.completed_at,
              u.id AS user_id, u.username, u.display_name, u.headline, u.country, u.avatar_updated_at,
              u.created_at AS member_since
       FROM proposals pr JOIN users u ON u.id = pr.freelancer_id WHERE pr.id = $1`,
      [ctx.id],
    ),
    pool.query(
      `SELECT e.id, e.type, e.note, e.links, e.reason, e.created_at, e.actor_id, a.display_name
       FROM job_events e LEFT JOIN users a ON a.id = e.actor_id
       WHERE e.proposal_id = $1 ORDER BY e.created_at, e.id`,
      [ctx.id],
    ),
  ]);
  const r = pr[0];
  const lastDispute = events.findLast((e) => e.type === "dispute_opened");

  return {
    role,
    project,
    job: {
      id: ctx.id,
      status: ctx.job_status,
      statusBeforeDispute: ctx.status_before_dispute,
      pricePerVideo: Number(r.price_per_video),
      total: money(Number(r.price_per_video) * project.videoCount),
      deliveryDate: r.delivery_date,
      coverLetter: r.cover_letter,
      sampleUrl: r.sample_url,
      sampleEmbedUrl: r.sample_url ? parseVideoUrl(r.sample_url)?.embedUrl ?? null : null,
      proposedAt: r.created_at,
      acceptedAt: r.accepted_at,
      completedAt: r.completed_at,
      // Only the side that opened the dispute can withdraw it.
      disputeOpenedByMe: ctx.job_status === "disputed" && lastDispute?.actor_id === viewer.id,
    },
    freelancer: {
      username: r.username,
      displayName: r.display_name,
      headline: r.headline ?? "",
      country: r.country ? COUNTRIES.find((c) => c.value === r.country)?.label ?? r.country : null,
      avatarUrl: avatarUrlOf({ id: r.user_id, avatar_updated_at: r.avatar_updated_at }),
      memberSince: r.member_since,
    },
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      note: e.note,
      links: e.links ?? [],
      reason: e.reason,
      createdAt: e.created_at,
      actorName: e.display_name ?? "Someone",
      byMe: e.actor_id === viewer.id,
    })),
  };
}

// ---- Actions ----------------------------------------------------------------

const cleanNote = (s) => (typeof s === "string" ? s.trim() : "");

function isHttpUrl(s) {
  try {
    const u = new URL(s);
    return (u.protocol === "https:" || u.protocol === "http:") && s.length <= 500;
  } catch {
    return false;
  }
}

// Who may do what, and from which status. `to` is the status afterwards
// (a function when it depends on the job).
const ACTIONS = {
  // Freelancer hands in the videos: one link each (Drive, Dropbox, private TikTok/YouTube...).
  submit: { role: "freelancer", from: ["in_progress"], to: "submitted", event: "submitted" },
  // Client asks for changes: back to in progress.
  revision: { role: "client", from: ["submitted"], to: "in_progress", event: "revision_requested" },
  // Client accepts the delivery: the job is done and the freelancer is owed the total.
  approve: { role: "client", from: ["submitted"], to: "completed", event: "approved" },
  // Either side freezes the job until it is sorted out.
  dispute: { role: "any", from: ["in_progress", "submitted"], to: "disputed", event: "dispute_opened" },
  withdraw_dispute: {
    role: "any",
    from: ["disputed"],
    to: (ctx) => ctx.status_before_dispute || "in_progress",
    event: "dispute_withdrawn",
  },
};

// Validates the body for an action. Returns { data } or { error }.
function validateAction(action, body, ctx) {
  const note = cleanNote(body.note);
  if (note.length > JOB_NOTE_MAX) return { error: `Keep the note under ${JOB_NOTE_MAX} characters.` };

  if (action === "submit") {
    const links = (Array.isArray(body.links) ? body.links : [])
      .map((l) => (typeof l === "string" ? l.trim() : ""))
      .filter(Boolean);
    if (!links.length) return { error: "Add at least one link to your videos." };
    if (links.length > ctx.video_count) return { error: `Add at most ${ctx.video_count} links (one per video).` };
    if (!links.every(isHttpUrl)) return { error: "Each link must be a full web address starting with https://" };
    return { data: { note, links } };
  }
  if (action === "revision" && !note) return { error: "Tell the freelancer what to change." };
  if (action === "dispute") {
    if (!DISPUTE_REASONS.some((r) => r.value === body.reason)) return { error: "Pick a reason." };
    if (!note) return { error: "Describe the problem." };
    return { data: { note, reason: body.reason } };
  }
  return { data: { note } };
}

// Runs one action on a job. Returns { status } on success or { error, code }.
export async function runJobAction(id, viewer, body) {
  const ctx = await getJobContext(id);
  if (!ctx) return { error: "Job not found.", code: 404 };
  const role = roleOf(ctx, viewer);
  if (!role) return { error: "This is not your job.", code: 403 };

  const action = ACTIONS[body?.action];
  if (!action) return { error: "Unknown action.", code: 400 };
  if (action.role !== "any" && action.role !== role) {
    return { error: `Only the ${action.role} can do this.`, code: 403 };
  }
  if (!action.from.includes(ctx.job_status)) {
    return { error: "The job has moved on since you opened this page. Refresh and try again.", code: 409 };
  }
  if (body.action === "withdraw_dispute") {
    const { rows } = await pool.query(
      "SELECT actor_id FROM job_events WHERE proposal_id = $1 AND type = 'dispute_opened' ORDER BY created_at DESC, id DESC LIMIT 1",
      [ctx.id],
    );
    if (rows[0]?.actor_id !== viewer.id) {
      return { error: "Only the side that opened the dispute can withdraw it.", code: 403 };
    }
  }

  const { data, error } = validateAction(body.action, body, ctx);
  if (error) return { error, code: 400 };

  const to = typeof action.to === "function" ? action.to(ctx) : action.to;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // The status check in WHERE makes two clicks at once (or both sides at once) safe.
    const { rowCount } = await client.query(
      `UPDATE proposals
       SET job_status = $2::varchar,
           status_before_dispute = CASE WHEN $2::varchar = 'disputed' THEN job_status ELSE NULL END,
           completed_at = CASE WHEN $2::varchar = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $1 AND job_status = $3 AND status = 'accepted'`,
      [ctx.id, to, ctx.job_status],
    );
    if (!rowCount) {
      await client.query("ROLLBACK");
      return { error: "The job has moved on since you opened this page. Refresh and try again.", code: 409 };
    }
    await client.query(
      `INSERT INTO job_events (proposal_id, actor_id, type, note, links, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ctx.id, viewer.id, action.event, data.note || null, data.links ?? null, data.reason ?? null],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Tell the other side.
  const recipient = role === "client" ? ctx.freelancer_id : ctx.client_id;
  await notifyJobEvent(ctx, recipient, viewer.id, action.event);
  return { status: to };
}

// The client may only undo an acceptance before any work was handed in.
export async function canUndoAcceptance(proposalId) {
  const { rows } = await pool.query(
    `SELECT job_status = 'in_progress'
            AND NOT EXISTS (SELECT 1 FROM job_events e WHERE e.proposal_id = pr.id) AS ok
     FROM proposals pr WHERE pr.id = $1`,
    [proposalId],
  );
  return Boolean(rows[0]?.ok);
}
