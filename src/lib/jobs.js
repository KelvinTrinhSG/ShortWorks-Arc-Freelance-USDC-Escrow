import "server-only";
import {
  AUTO_APPROVE_HOURS,
  DISPUTE_DECISION_HOURS,
  DISPUTE_REASONS,
  JOB_NOTE_MAX,
  JOB_STATUSES,
  PROJECTS_PAGE_SIZE,
  VIDEO_LENGTHS,
  WORK_TYPES,
} from "@/data/projectOptions";
import { COUNTRIES, PLATFORMS } from "@/data/talentOptions";
import {
  arcRefund,
  arcRelease,
  arcSetFrozen,
  confirmClientRelease,
  getArcPayment,
  hasLiveArcPayment,
  reconcileArcPayments,
} from "@/lib/arcPayments";
import pool from "@/lib/db";
import { notifyJobEvent, notifyProposalDecision } from "@/lib/notifications";
import { PaymentError, capturePayment, getJobPayment, releasePayment } from "@/lib/payments";
import { avatarUrlOf } from "@/lib/profile";
import { getProject } from "@/lib/projects";
import { parseVideoUrl } from "@/lib/videoUrl";

// A "job" is a freelancer's accepted proposal. Its id is the proposal id.
// Status (proposals.job_status): in_progress -> submitted -> completed, and
// disputed on the side. A revision request sends a submitted job back to in_progress.

const known = (options, list) => list.filter((v) => options.some((o) => o.value === v));
const todayUtc = () => new Date().toISOString().slice(0, 10);
const money = (n) => Math.round(n * 100) / 100;

// `today()` returns the SQL for UTC today. Every sort puts finished jobs (completed,
// cancelled) last. Priority (default): what needs attention first, then the nearest delivery date.
const FINISHED = "pr.job_status IN ('completed', 'cancelled')";
export const JOB_SORTS = {
  priority: (today) => `
    CASE
      WHEN pr.job_status = 'disputed' THEN 0
      WHEN pr.job_status = 'in_progress' AND pr.delivery_date < ${today()} THEN 1
      WHEN pr.job_status = 'submitted' THEN 2
      WHEN pr.job_status = 'in_progress' THEN 3
      ELSE 4
    END,
    CASE WHEN ${FINISHED} THEN NULL ELSE pr.delivery_date END ASC,
    pr.completed_at DESC NULLS LAST, pr.id`,
  newest: () => `${FINISHED}, pr.accepted_at DESC NULLS LAST, pr.id DESC`,
  "total-desc": () => `${FINISHED}, (pr.price_per_video * p.video_count) DESC, pr.id`,
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

// The viewer's jobs for /jobs: a freelancer sees the jobs they were hired for,
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

// The freelancer's jobs for /my-jobs, soonest delivery first.
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

// ---- The job's money: PayPal or USDC on Arc ---------------------------------------

// Pays the freelancer from whatever holds the money.
const takeJobPayment = async (id) => ((await hasLiveArcPayment(id)) ? arcRelease(id) : capturePayment(id));
// Gives the money back to the client (no-op when nothing is held).
const returnJobPayment = async (id) => ((await hasLiveArcPayment(id)) ? arcRefund(id) : releasePayment(id));

// The payment to show on the job: the one holding or that took the money, else the latest attempt.
async function getPayment(id) {
  const [arc, paypal] = await Promise.all([getArcPayment(id), getJobPayment(id)]);
  if (arc && ["funded", "releasing", "released", "refunding"].includes(arc.status)) return arc;
  if (paypal && !["created", "voided", "expired", "failed"].includes(paypal.status)) return paypal;
  return arc ?? paypal;
}

// /jobs/{id}: the project, the accepted proposal, the freelancer and the activity log.
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
  const lastSubmitted = events.findLast((e) => e.type === "submitted");
  const autoApproveAt =
    ctx.job_status === "submitted" && lastSubmitted
      ? new Date(new Date(lastSubmitted.created_at).getTime() + AUTO_APPROVE_HOURS * 3600000)
      : null;
  const payment = await getPayment(ctx.id);
  const hours = (iso, h) => new Date(new Date(iso).getTime() + h * 3600000);
  // An Arc hold doesn't run out during a dispute (the escrow is frozen), so it doesn't cut the decision time short.
  const holdEndsAt = payment?.method !== "arc" && payment?.expiresAt ? new Date(payment.expiresAt) : Infinity;

  return {
    role,
    project,
    payment,
    job: {
      // When ShortWorks will decide an open dispute: 48 hours after it was opened,
      // or before the held payment expires if that comes first.
      disputeDecideBy:
        ctx.job_status === "disputed" && lastDispute
          ? new Date(Math.min(hours(lastDispute.created_at, DISPUTE_DECISION_HOURS), holdEndsAt))
          : null,
      // When a submitted job approves itself if the client doesn't answer. From then on the
      // freelancer can also claim the payment from the job page instead of waiting for the cron.
      autoApproveAt,
      canClaim: role === "freelancer" && autoApproveAt !== null && autoApproveAt <= new Date(),
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
  const isArc = await hasLiveArcPayment(ctx.id);
  const disputeChange = body.action === "dispute" || body.action === "withdraw_dispute";
  try {
    if (body.action === "approve") {
      // Take the money first; the job only completes once the freelancer is paid.
      // On Arc the client normally releases from their own wallet and sends the transaction hash.
      if (isArc && body.txHash) await confirmClientRelease(ctx.id, body.txHash);
      else await takeJobPayment(ctx.id);
    } else if (isArc && disputeChange) {
      // A dispute freezes the escrow so the client can't take the money back meanwhile.
      await arcSetFrozen(ctx.id, body.action === "dispute");
    }
  } catch (err) {
    if (err instanceof PaymentError) return { error: err.message, code: err.code };
    throw err;
  }
  const ok = await applyTransition(ctx, {
    from: ctx.job_status,
    to,
    event: action.event,
    actorId: viewer.id,
    ...data,
    // Money already moved: the job completes even if something else changed meanwhile.
    force: body.action === "approve",
  });
  if (!ok) {
    // Undo the freeze (or unfreeze) the job no longer needs.
    if (isArc && disputeChange) await arcSetFrozen(ctx.id, body.action !== "dispute").catch(() => {});
    return { error: "The job has moved on since you opened this page. Refresh and try again.", code: 409 };
  }

  // Tell the other side.
  const recipient = role === "client" ? ctx.freelancer_id : ctx.client_id;
  await notifyJobEvent(ctx, recipient, viewer.id, action.event);
  return { status: to };
}

// Moves a job to `to` and logs the event, in one transaction. The `from` check in WHERE
// makes two clicks at once (or both sides at once) safe; `force` skips it.
// Returns false when the job was no longer in `from`.
async function applyTransition(ctx, { from, to, event, actorId, note, links, reason, force = false }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query(
      `UPDATE proposals
       SET job_status = $2::varchar,
           status_before_dispute = CASE WHEN $2::varchar = 'disputed' THEN job_status ELSE NULL END,
           completed_at = CASE WHEN $2::varchar = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $1 AND status = 'accepted' AND ($4::boolean OR job_status = $3)`,
      [ctx.id, to, from, force],
    );
    if (!rowCount) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `INSERT INTO job_events (proposal_id, actor_id, type, note, links, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ctx.id, actorId, event, note || null, links ?? null, reason ?? null],
    );
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ---- ShortWorks' own steps (cron, admin) --------------------------------------

// Submitted jobs the client left unanswered for AUTO_APPROVE_HOURS since the last delivery.
// Disputed jobs are never in 'submitted'.
const DUE_FOR_AUTO_APPROVAL = `pr.status = 'accepted' AND pr.job_status = 'submitted'
  AND (SELECT MAX(e.created_at) FROM job_events e WHERE e.proposal_id = pr.id AND e.type = 'submitted')
      < NOW() - make_interval(hours => $1)`;

// Pays the freelancer and completes the job, as if the client had approved it.
async function autoApprove(id) {
  const ctx = await getJobContext(id);
  await takeJobPayment(id);
  await applyTransition(ctx, { from: "submitted", to: "completed", event: "auto_approved", actorId: null, force: true });
  await notifyJobEvent(ctx, ctx.freelancer_id, null, "auto_approved");
  await notifyJobEvent(ctx, ctx.client_id, null, "auto_approved");
}

// Approves every job that is due (and pays the freelancer).
// Returns what happened to each, for the cron log.
export async function autoApproveDueJobs() {
  const { rows } = await pool.query(`SELECT pr.id FROM proposals pr WHERE ${DUE_FOR_AUTO_APPROVAL}`, [AUTO_APPROVE_HOURS]);
  const results = [];
  for (const { id } of rows) {
    try {
      await autoApprove(id);
      results.push({ id, ok: true });
    } catch (err) {
      results.push({ id, ok: false, error: err.message });
    }
  }
  return results;
}

// The freelancer claims the payment of a job that is due for auto-approval, without waiting
// for the daily cron. Returns { status } or { error, code }.
export async function claimAutoApproval(id, viewer) {
  const ctx = await getJobContext(id);
  if (!ctx) return { error: "Job not found.", code: 404 };
  if (roleOf(ctx, viewer) !== "freelancer") return { error: "Only the freelancer can do this.", code: 403 };
  const { rows } = await pool.query(`SELECT pr.id FROM proposals pr WHERE pr.id = $2 AND ${DUE_FOR_AUTO_APPROVAL}`, [
    AUTO_APPROVE_HOURS,
    ctx.id,
  ]);
  if (!rows.length) {
    return { error: "The client still has time to review this delivery. Refresh and try again.", code: 409 };
  }
  try {
    await autoApprove(ctx.id);
  } catch (err) {
    if (err instanceof PaymentError) return { error: err.message, code: err.code };
    throw err;
  }
  return { status: "completed" };
}

// An admin settles a dispute: pay the freelancer everything, or release everything
// to the client. No split (docs/payments.md §12).
export async function resolveDispute(id, adminId, decision, note) {
  const ctx = await getJobContext(id);
  if (!ctx) return { error: "Job not found.", code: 404 };
  if (ctx.job_status !== "disputed") return { error: "This job is not in dispute.", code: 409 };
  if (!["pay", "release"].includes(decision)) return { error: "Pick a decision.", code: 400 };
  const text = cleanNote(note);
  if (!text || text.length > JOB_NOTE_MAX) return { error: "Explain the decision to both sides.", code: 400 };

  try {
    if (decision === "pay") await takeJobPayment(ctx.id);
    else await returnJobPayment(ctx.id);
  } catch (err) {
    if (err instanceof PaymentError) return { error: err.message, code: err.code };
    throw err;
  }
  await applyTransition(ctx, {
    from: "disputed",
    to: decision === "pay" ? "completed" : "cancelled",
    event: "dispute_resolved",
    actorId: adminId,
    note: text,
    reason: decision,
    force: true,
  });
  await notifyJobEvent(ctx, ctx.freelancer_id, null, "dispute_resolved");
  await notifyJobEvent(ctx, ctx.client_id, null, "dispute_resolved");
  return { status: decision === "pay" ? "completed" : "cancelled" };
}

// Open disputes for the admin page, the most urgent decision first: 48 hours after
// opening, or sooner when the held payment expires first.
export async function getOpenDisputes() {
  const { rows } = await pool.query(
    `SELECT pr.id, p.title, c.display_name AS client_name, f.display_name AS freelancer_name,
            COALESCE(ja.amount, jp.amount) AS amount, jp.expires_at,
            COALESCE(ja.status, jp.status) AS payment_status, (ja.id IS NOT NULL) AS is_arc,
            e.created_at AS opened_at, e.reason, e.note, a.display_name AS opened_by,
            LEAST(e.created_at + make_interval(hours => $1), COALESCE(CASE WHEN ja.id IS NULL THEN jp.expires_at END, 'infinity')) AS decide_by
     FROM proposals pr
     JOIN projects p ON p.id = pr.project_id
     JOIN users c ON c.id = p.client_id
     JOIN users f ON f.id = pr.freelancer_id
     LEFT JOIN job_payments jp ON jp.proposal_id = pr.id
     -- An Arc escrow holding the money (frozen during the dispute, so no deadline from it).
     LEFT JOIN job_arc_payments ja ON ja.proposal_id = pr.id AND ja.status IN ('funded', 'releasing', 'refunding')
     JOIN LATERAL (SELECT * FROM job_events x WHERE x.proposal_id = pr.id AND x.type = 'dispute_opened'
                   ORDER BY x.created_at DESC, x.id DESC LIMIT 1) e ON TRUE
     LEFT JOIN users a ON a.id = e.actor_id
     WHERE pr.status = 'accepted' AND pr.job_status = 'disputed'
     ORDER BY decide_by`,
    [DISPUTE_DECISION_HOURS],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    clientName: r.client_name,
    freelancerName: r.freelancer_name,
    amount: Number(r.amount ?? 0),
    currency: r.is_arc ? "USDC" : "USD",
    paymentStatus: r.payment_status,
    expiresAt: r.expires_at,
    openedAt: r.opened_at,
    openedBy: r.opened_by,
    reason: r.reason,
    note: r.note,
    decideBy: r.decide_by,
  }));
}

// The held money went away without ShortWorks asking (the PayPal hold expired or was voided
// on PayPal, or the Arc escrow gave the USDC back): nobody can be paid for this job any more,
// so it is cancelled and both sides are told. `event` is "payment_expired", "payment_voided"
// or "payment_refunded".
// Returns true when the job was cancelled.
export async function cancelJobForLostPayment(id, event) {
  const ctx = await getJobContext(id);
  if (!ctx || ["completed", "cancelled"].includes(ctx.job_status)) return false;
  const ok = await applyTransition(ctx, { from: ctx.job_status, to: "cancelled", event, actorId: null });
  if (!ok) return false;
  await notifyJobEvent(ctx, ctx.freelancer_id, null, event);
  await notifyJobEvent(ctx, ctx.client_id, null, event);
  return true;
}

// Daily (cron): lines Arc payments up with the chain, then moves the jobs whose money moved
// outside ShortWorks. Released on-chain by the client = approved; given back (the client
// reclaimed after expiry, or the freelancer refunded) = cancelled.
export async function syncArcJobs() {
  const outcomes = await reconcileArcPayments();
  for (const o of outcomes) {
    const ctx = await getJobContext(o.proposalId);
    if (!ctx || ["completed", "cancelled"].includes(ctx.job_status)) continue;
    if (o.outcome === "released") {
      const ok = await applyTransition(ctx, { from: ctx.job_status, to: "completed", event: "approved", actorId: ctx.client_id, force: true });
      if (ok) await notifyJobEvent(ctx, ctx.freelancer_id, ctx.client_id, "approved");
      o.job = ok ? "completed" : ctx.job_status;
    } else if (o.outcome === "refunded") {
      o.job = (await cancelJobForLostPayment(ctx.id, "payment_refunded")) ? "cancelled" : ctx.job_status;
    }
  }
  return outcomes;
}

// The client undoes a hire, only before any work was handed in. The proposal goes back
// to `status` (pending / declined) first, in the same statement as the check, so no work
// can be handed in while PayPal releases the hold; if releasing fails, the hire is restored.
// Returns {} on success or { error, code }.
export async function undoHire(proposalId, status) {
  const { rows } = await pool.query(
    `UPDATE proposals pr SET status = $2::varchar, accepted_at = NULL
     FROM (SELECT accepted_at FROM proposals WHERE id = $1) old
     WHERE pr.id = $1 AND pr.status = 'accepted' AND pr.job_status = 'in_progress'
       AND NOT EXISTS (SELECT 1 FROM job_events e WHERE e.proposal_id = pr.id)
     RETURNING old.accepted_at`,
    [proposalId, status],
  );
  if (!rows[0]) return { error: "Work on this job has already started, so the hire can't be undone.", code: 409 };
  try {
    await returnJobPayment(proposalId);
  } catch (err) {
    await pool.query("UPDATE proposals SET status = 'accepted', accepted_at = $2 WHERE id = $1", [proposalId, rows[0].accepted_at]);
    if (err instanceof PaymentError) return { error: err.message, code: err.code };
    throw err;
  }
  await notifyProposalDecision(proposalId, status);
  return {};
}
