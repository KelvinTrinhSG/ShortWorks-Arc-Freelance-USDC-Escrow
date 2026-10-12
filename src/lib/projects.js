import "server-only";
import {
  BRIEF_MAX,
  COVER_LETTER_MAX,
  MAX_DELIVERY_DAYS,
  MAX_REFERENCES,
  MY_STATUSES,
  PROJECTS_PAGE_SIZE,
  PROJECT_TITLE_MAX,
  PROJECT_VIDEO_COUNT,
  VIDEO_LENGTHS,
  WORK_TYPES,
} from "@/data/projectOptions";
import { COUNTRIES, PLATFORMS } from "@/data/talentOptions";
import { arcEnabled } from "@/lib/arc";
import pool from "@/lib/db";
import { notifyProposalDecision, notifyProposalReceived } from "@/lib/notifications";
import { hireBlocker } from "@/lib/payments";
import { avatarUrlOf } from "@/lib/profile";
import { parseVideoUrl } from "@/lib/videoUrl";

const values = (options) => options.map((o) => o.value);
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
// Today in UTC as yyyy-mm-dd. Deadlines are whole days, so a few hours of
// time-zone difference with the browser only matter on the boundary day.
const todayUtc = () => new Date().toISOString().slice(0, 10);
const money = (n) => Math.round(n * 100) / 100;

// ---- Validation -------------------------------------------------------------

// Returns { data } or { error } for POST /api/projects. A project is one video; when editing,
// `currentVideoCount` lets a project posted before that rule keep its count.
export function validateProject(body, currentVideoCount = PROJECT_VIDEO_COUNT) {
  const b = body ?? {};
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const brief = typeof b.brief === "string" ? b.brief.trim() : "";
  const count = b.videoCount === undefined ? PROJECT_VIDEO_COUNT : Number(b.videoCount);
  const budget = Number(b.budgetPerVideo);
  const platforms = Array.isArray(b.platforms) ? [...new Set(b.platforms)] : [];

  if (!title || title.length > PROJECT_TITLE_MAX) return { error: `Title is required (max ${PROJECT_TITLE_MAX} characters).` };
  if (!platforms.length || platforms.some((p) => !values(PLATFORMS).includes(p))) return { error: "Pick at least one valid platform." };
  if (!values(WORK_TYPES).includes(b.workType)) return { error: "Pick the type of work." };
  if (count !== PROJECT_VIDEO_COUNT && count !== currentVideoCount) return { error: "A project is one video. Post another project for each extra video." };
  if (!values(VIDEO_LENGTHS).includes(b.videoLength)) return { error: "Pick the video length." };
  if (!brief || brief.length > BRIEF_MAX) return { error: `Brief is required (max ${BRIEF_MAX} characters).` };
  if (!isDate(b.deadline) || b.deadline <= todayUtc()) return { error: "The deadline must be a date after today." };
  if (!(budget > 0) || budget > 100000) return { error: "Budget per video must be between 1 and 100000." };

  const refs = Array.isArray(b.references) ? b.references : [];
  if (refs.length > MAX_REFERENCES) return { error: `Add at most ${MAX_REFERENCES} reference videos.` };
  const references = [];
  for (const url of refs) {
    const parsed = typeof url === "string" ? parseVideoUrl(url) : null;
    if (!parsed) return { error: "Reference videos must be TikTok, Reels, Shorts or Facebook links." };
    references.push({ url: url.trim(), platform: parsed.platform });
  }

  return {
    data: { title, platforms, workType: b.workType, videoCount: count, videoLength: b.videoLength, brief, deadline: b.deadline, budgetPerVideo: money(budget), references },
  };
}

// Returns { data } or { error } for POST /api/projects/:id/proposals.
export function validateProposal(body, project) {
  const b = body ?? {};
  const price = Number(b.pricePerVideo);
  const coverLetter = typeof b.coverLetter === "string" ? b.coverLetter.trim() : "";
  if (!(price > 0) || price > 100000) return { error: "Price per video must be between 1 and 100000." };
  if (!isDate(b.deliveryDate) || b.deliveryDate < todayUtc()) return { error: "Pick a delivery date from today onward." };
  if (b.deliveryDate > project.deadline) return { error: "The delivery date must be on or before the project deadline." };
  // A PayPal hold lasts 29 days: leave room for review (docs/payments.md Q2).
  const lastDay = new Date(Date.now() + MAX_DELIVERY_DAYS * 86400000).toISOString().slice(0, 10);
  if (b.deliveryDate > lastDay) return { error: `The delivery date must be within ${MAX_DELIVERY_DAYS} days from today.` };
  if (!coverLetter || coverLetter.length > COVER_LETTER_MAX) return { error: `Cover letter is required (max ${COVER_LETTER_MAX} characters).` };
  let sampleUrl = null;
  if (b.sampleUrl) {
    if (typeof b.sampleUrl !== "string" || !parseVideoUrl(b.sampleUrl)) return { error: "The sample video must be a TikTok, Reels, Shorts or Facebook link." };
    sampleUrl = b.sampleUrl.trim();
  }
  return { data: { pricePerVideo: money(price), deliveryDate: b.deliveryDate, coverLetter, sampleUrl } };
}

// A project (from getProject) in the shape of the Create Project form state: to edit it, or,
// with `copy`, to post it again (one video; a deadline already past is left for the client to pick).
export function projectFormState(p, { copy = false } = {}) {
  return {
    title: p.title,
    platforms: p.platforms,
    workType: p.workType,
    videoCount: String(copy ? PROJECT_VIDEO_COUNT : p.videoCount),
    videoLength: p.videoLength,
    brief: p.brief,
    deadline: copy && p.deadline <= todayUtc() ? "" : p.deadline,
    budgetPerVideo: String(p.budgetPerVideo),
    references: p.references,
  };
}

// ---- Writes -----------------------------------------------------------------

export async function createProject(clientId, d) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO projects (client_id, title, platforms, work_type, video_count, video_length, brief, deadline, budget_per_video)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [clientId, d.title, d.platforms, d.workType, d.videoCount, d.videoLength, d.brief, d.deadline, d.budgetPerVideo],
    );
    for (const [i, r] of d.references.entries()) {
      await client.query(
        "INSERT INTO project_references (project_id, url, platform, sort_order) VALUES ($1, $2, $3, $4)",
        [rows[0].id, r.url, r.platform, i],
      );
    }
    await client.query("COMMIT");
    return rows[0].id;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Throws { code: "23505" } from Postgres when the freelancer already applied.
export async function createProposal(projectId, freelancerId, d) {
  const { rows } = await pool.query(
    `INSERT INTO proposals (project_id, freelancer_id, price_per_video, delivery_date, cover_letter, sample_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [projectId, freelancerId, d.pricePerVideo, d.deliveryDate, d.coverLetter, d.sampleUrl],
  );
  await notifyProposalReceived(rows[0].id);
  return rows[0].id;
}

// ---- Reads ------------------------------------------------------------------

const PROJECT_COLUMNS = `
  p.id, p.title, p.platforms, p.work_type, p.video_count, p.video_length, p.brief, p.service_id,
  to_char(p.deadline, 'YYYY-MM-DD') AS deadline, p.budget_per_video, p.status, p.created_at,
  p.client_id, c.display_name AS client_name, c.username AS client_username,
  c.country AS client_country, c.avatar_updated_at, c.created_at AS client_since,
  (SELECT COUNT(*) FROM proposals pr WHERE pr.project_id = p.id)::int AS proposal_count,
  (SELECT COUNT(*) FROM project_references r WHERE r.project_id = p.id)::int AS reference_count,
  (SELECT COUNT(*) FROM proposals pr WHERE pr.project_id = p.id AND pr.status = 'accepted')::int AS accepted_count
`;

const toProject = (row) => ({
  id: row.id,
  title: row.title,
  platforms: row.platforms,
  workType: row.work_type,
  videoCount: row.video_count,
  videoLength: row.video_length,
  brief: row.brief,
  deadline: row.deadline,
  budgetPerVideo: Number(row.budget_per_video),
  status: row.status,
  // Set when the project is a service order (lib/services.js), not a posted project.
  serviceId: row.service_id ?? null,
  // Hired = the client accepted a proposal. The project then leaves the public
  // list and stops taking proposals (until the client undoes the acceptance).
  hired: row.accepted_count > 0,
  // Open = accepting proposals: not closed, deadline still ahead, nobody hired yet.
  isOpen: row.status === "open" && row.deadline >= todayUtc() && row.accepted_count === 0,
  createdAt: row.created_at,
  proposalCount: row.proposal_count,
  referenceCount: row.reference_count,
  client: {
    displayName: row.client_name,
    username: row.client_username,
    avatarUrl: avatarUrlOf({ id: row.client_id, avatar_updated_at: row.avatar_updated_at }),
    country: row.client_country,
    memberSince: row.client_since,
  },
});

export const SORTS = {
  newest: "p.created_at DESC",
  "budget-desc": "p.budget_per_video DESC, p.created_at DESC",
  "total-desc": "(p.budget_per_video * p.video_count) DESC, p.created_at DESC",
  "deadline-asc": "p.deadline ASC, p.created_at DESC",
  // Most proposals first (home page "Popular Projects").
  popular: "(SELECT COUNT(*) FROM proposals pr WHERE pr.project_id = p.id) DESC, p.created_at DESC",
};

const known = (options, list) => list.filter((v) => values(options).includes(v));

export function parseProjectFilters(params) {
  const list = (key) => (params.get(key) || "").split(",").map((s) => s.trim()).filter(Boolean);
  const minBudget = Number(params.get("minBudget"));
  const page = Math.floor(Number(params.get("page")));
  return {
    q: (params.get("q") || "").trim().slice(0, 100),
    platforms: known(PLATFORMS, list("platform")),
    workTypes: known(WORK_TYPES, list("workType")),
    lengths: known(VIDEO_LENGTHS, list("length")),
    minBudget: Number.isFinite(minBudget) && minBudget > 0 ? minBudget : null,
    // Only applied for a logged-in freelancer (see searchProjects).
    statuses: known(MY_STATUSES, list("status")),
    sort: params.get("sort") in SORTS ? params.get("sort") : "newest",
    page: page > 0 ? page : 1,
  };
}

// Where a freelancer stands on a project, for the badge on its card:
// their proposal's status wins over the invitation.
const MY_STATUS_SQL = (param) => `
  COALESCE(
    (SELECT CASE pr.status WHEN 'pending' THEN 'submitted' ELSE pr.status END
     FROM proposals pr WHERE pr.project_id = p.id AND pr.freelancer_id = ${param}),
    (SELECT CASE WHEN i.declined_at IS NULL THEN 'invited' ELSE 'invite_declined' END
     FROM project_invitations i WHERE i.project_id = p.id AND i.freelancer_id = ${param})
  )`;

// Open projects only: not closed, deadline not passed, nobody hired yet. Newest first by default.
// `freelancerId` (optional) adds `myStatus` to each project: submitted | accepted |
// declined | invited | invite_declined | null, and enables the `statuses` filter.
export async function searchProjects(f, freelancerId = null) {
  const where = [
    "p.status = 'open'",
    "p.deadline >= CURRENT_DATE",
    "NOT EXISTS (SELECT 1 FROM proposals pr WHERE pr.project_id = p.id AND pr.status = 'accepted')",
    "NOT c.hidden", // posted by a hidden (test) account
  ];
  const args = [];
  const add = (sql, value) => {
    args.push(value);
    where.push(sql.replaceAll("?", `$${args.length}`));
  };
  if (f.q) add("(p.title ILIKE ? OR p.brief ILIKE ?)", `%${f.q.replace(/[\\%_]/g, "\\$&")}%`);
  if (f.platforms.length) add("p.platforms && ?::text[]", f.platforms);
  if (f.workTypes.length) add("p.work_type = ANY(?::text[])", f.workTypes);
  if (f.lengths.length) add("p.video_length = ANY(?::text[])", f.lengths);
  if (f.minBudget) add("p.budget_per_video >= ?", f.minBudget);

  let myStatus = "";
  if (freelancerId) {
    args.push(freelancerId);
    const status = MY_STATUS_SQL(`$${args.length}`);
    myStatus = `, ${status} AS my_status`;
    if (f.statuses.length) add(`COALESCE(${status}, 'none') = ANY(?::text[])`, f.statuses);
  }

  args.push(PROJECTS_PAGE_SIZE, (f.page - 1) * PROJECTS_PAGE_SIZE);
  const { rows } = await pool.query(
    `SELECT ${PROJECT_COLUMNS}${myStatus}, COUNT(*) OVER() AS total
     FROM projects p JOIN users c ON c.id = p.client_id
     WHERE ${where.join(" AND ")}
     ORDER BY ${SORTS[f.sort]}
     LIMIT $${args.length - 1} OFFSET $${args.length}`,
    args,
  );
  return {
    projects: rows.map((r) => (freelancerId ? { ...toProject(r), myStatus: r.my_status } : toProject(r))),
    total: rows[0] ? Number(rows[0].total) : 0,
    page: f.page,
    pageSize: PROJECTS_PAGE_SIZE,
  };
}

// Project page. What else comes back depends on who is looking:
// the owner sees every proposal, a freelancer sees their own.
export async function getProject(id, viewer) {
  if (!/^\d+$/.test(String(id))) return null;
  const { rows } = await pool.query(
    `SELECT ${PROJECT_COLUMNS} FROM projects p JOIN users c ON c.id = p.client_id WHERE p.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const project = toProject(rows[0]);

  const { rows: refs } = await pool.query(
    "SELECT url, platform FROM project_references WHERE project_id = $1 ORDER BY sort_order, id",
    [id],
  );
  project.references = refs.map((r) => ({ ...r, embedUrl: parseVideoUrl(r.url)?.embedUrl ?? null }));

  const isOwner = viewer?.id === rows[0].client_id;
  const proposalQuery = `
    SELECT pr.id, pr.price_per_video, to_char(pr.delivery_date, 'YYYY-MM-DD') AS delivery_date,
           pr.cover_letter, pr.sample_url, pr.status, pr.created_at, pr.accepted_at,
           u.id AS freelancer_id, u.username, u.display_name, u.headline, u.country, u.avatar_updated_at,
           u.paypal_status, u.paypal_merchant_id, u.arc_wallet
    FROM proposals pr JOIN users u ON u.id = pr.freelancer_id
    WHERE pr.project_id = $1`;
  const toProposal = (r) => ({
    id: r.id,
    pricePerVideo: Number(r.price_per_video),
    deliveryDate: r.delivery_date,
    coverLetter: r.cover_letter,
    sampleUrl: r.sample_url,
    sampleEmbedUrl: r.sample_url ? parseVideoUrl(r.sample_url)?.embedUrl ?? null : null,
    status: r.status,
    createdAt: r.created_at,
    acceptedAt: r.accepted_at,
    freelancer: {
      username: r.username,
      displayName: r.display_name,
      headline: r.headline ?? "",
      country: r.country ? COUNTRIES.find((c) => c.value === r.country)?.label ?? r.country : null,
      avatarUrl: avatarUrlOf({ id: r.freelancer_id, avatar_updated_at: r.avatar_updated_at }),
    },
  });

  let proposals = [];
  let myProposal = null;
  if (isOwner) {
    const res = await pool.query(`${proposalQuery} ORDER BY pr.created_at`, [id]);
    // What the owner needs for Hire & pay: the PayPal button pays this merchant; `arc` is
    // there when paying in USDC on Arc is set up (with why it can't be used, if so).
    const arcOn = arcEnabled();
    proposals = res.rows.map((r) => ({
      ...toProposal(r),
      hire: {
        amount: money(Number(r.price_per_video) * project.videoCount),
        merchantId: r.paypal_status === "ready" ? r.paypal_merchant_id : null,
        blocker: hireBlocker({ status: r.status, deliveryDate: r.delivery_date, paypalStatus: r.paypal_status }),
        arc: arcOn
          ? { blocker: hireBlocker({ status: r.status, deliveryDate: r.delivery_date, arcWallet: r.arc_wallet, method: "arc" }) }
          : null,
      },
    }));
  } else if (viewer?.accountType === "freelancer") {
    const res = await pool.query(`${proposalQuery} AND pr.freelancer_id = $2`, [id, viewer.id]);
    myProposal = res.rows[0] ? toProposal(res.rows[0]) : null;
  }

  return { project, isOwner, proposals, myProposal };
}

// A client's open projects for their employer page (/employers/{username}),
// newest first. Service orders are private and never listed.
export async function getClientOpenProjects(clientId) {
  const { rows } = await pool.query(
    `SELECT ${PROJECT_COLUMNS}
     FROM projects p JOIN users c ON c.id = p.client_id
     WHERE p.client_id = $1 AND p.service_id IS NULL AND p.status = 'open' AND p.deadline >= CURRENT_DATE
       AND NOT EXISTS (SELECT 1 FROM proposals pr WHERE pr.project_id = p.id AND pr.status = 'accepted')
     ORDER BY p.created_at DESC`,
    [clientId],
  );
  return rows.map(toProject);
}

// ---- Owner & proposal management -------------------------------------------

// Every project a client posted, with proposal counts, for /my-projects.
export async function getOwnedProjects(clientId) {
  const { rows } = await pool.query(
    `SELECT ${PROJECT_COLUMNS},
       (SELECT COUNT(*) FROM proposals pr WHERE pr.project_id = p.id AND pr.status = 'pending')::int AS pending_count
     FROM projects p JOIN users c ON c.id = p.client_id
     WHERE p.client_id = $1
     ORDER BY p.created_at DESC`,
    [clientId],
  );
  return rows.map((r) => ({
    ...toProject(r),
    pendingCount: r.pending_count,
    acceptedCount: r.accepted_count,
  }));
}

// The project's owner id and status, or null. Used to authorize changes.
export async function getProjectOwner(id) {
  if (!/^\d+$/.test(String(id))) return null;
  const { rows } = await pool.query(
    "SELECT id, client_id, status, video_count, to_char(deadline, 'YYYY-MM-DD') AS deadline FROM projects WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

// Replace a project's fields and reference videos (same shape as createProject).
export async function updateProject(id, d) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE projects SET title = $2, platforms = $3, work_type = $4, video_count = $5,
         video_length = $6, brief = $7, deadline = $8, budget_per_video = $9, updated_at = NOW()
       WHERE id = $1`,
      [id, d.title, d.platforms, d.workType, d.videoCount, d.videoLength, d.brief, d.deadline, d.budgetPerVideo],
    );
    await client.query("DELETE FROM project_references WHERE project_id = $1", [id]);
    for (const [i, r] of d.references.entries()) {
      await client.query(
        "INSERT INTO project_references (project_id, url, platform, sort_order) VALUES ($1, $2, $3, $4)",
        [id, r.url, r.platform, i],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function setProjectStatus(id, status) {
  await pool.query("UPDATE projects SET status = $2, updated_at = NOW() WHERE id = $1", [id, status]);
}

// Proposals and reference videos go with it (ON DELETE CASCADE).
export async function deleteProject(id) {
  await pool.query("DELETE FROM projects WHERE id = $1", [id]);
}

// A proposal plus what is needed to authorize changes to it.
export async function getProposalContext(id) {
  if (!/^\d+$/.test(String(id))) return null;
  const { rows } = await pool.query(
    `SELECT pr.id, pr.freelancer_id, pr.status, p.id AS project_id, p.client_id,
            p.status AS project_status, to_char(p.deadline, 'YYYY-MM-DD') AS deadline,
            EXISTS (SELECT 1 FROM proposals a WHERE a.project_id = p.id AND a.status = 'accepted') AS hired
     FROM proposals pr JOIN projects p ON p.id = pr.project_id
     WHERE pr.id = $1`,
    [id],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    freelancerId: r.freelancer_id,
    status: r.status,
    project: {
      id: r.project_id,
      clientId: r.client_id,
      deadline: r.deadline,
      isOpen: r.project_status === "open" && r.deadline >= todayUtc() && !r.hired,
    },
  };
}

export async function updateProposal(id, d) {
  await pool.query(
    `UPDATE proposals SET price_per_video = $2, delivery_date = $3, cover_letter = $4, sample_url = $5
     WHERE id = $1`,
    [id, d.pricePerVideo, d.deliveryDate, d.coverLetter, d.sampleUrl],
  );
}

// accepted_at marks the start of the job; it is cleared when the client undoes or declines.
export async function setProposalStatus(id, status) {
  await pool.query(
    `UPDATE proposals
     SET status = $2::varchar,
         accepted_at = CASE WHEN $2::varchar = 'accepted' THEN COALESCE(accepted_at, NOW()) ELSE NULL END
     WHERE id = $1`,
    [id, status],
  );
  await notifyProposalDecision(id, status);
}

export async function deleteProposal(id) {
  await pool.query("DELETE FROM proposals WHERE id = $1", [id]);
}
