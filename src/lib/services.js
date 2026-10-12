import "server-only";
import { VIDEO_LENGTHS, WORK_TYPES } from "@/data/projectOptions";
import {
  DELIVERY_DAYS,
  MAX_ORDER_VIDEOS,
  MAX_SAMPLES,
  SERVICES_PAGE_SIZE,
  SERVICE_BRIEF_MAX,
  SERVICE_DESCRIPTION_MAX,
  SERVICE_TITLE_MAX,
} from "@/data/serviceOptions";
import { COUNTRIES, PLATFORMS, REVISIONS } from "@/data/talentOptions";
import { arcEnabled } from "@/lib/arc";
import pool from "@/lib/db";
import { hireBlocker } from "@/lib/payments";
import { avatarUrlOf } from "@/lib/profile";
import { parseVideoUrl } from "@/lib/videoUrl";

// A service is a freelancer's ready-made offer: one price per video, a delivery time
// for the whole order. Ordering one creates a private project + the freelancer's
// proposal, which the client hires with Hire & pay (lib/payments.js) — from there it
// is an ordinary job.

const values = (options) => options.map((o) => o.value);
const known = (options, list) => list.filter((v) => values(options).includes(v));
const money = (n) => Math.round(n * 100) / 100;
const addDays = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

// ---- Validation ---------------------------------------------------------------

// Returns { data } or { error } for creating / editing a service.
export function validateService(body) {
  const b = body ?? {};
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";
  const platforms = Array.isArray(b.platforms) ? [...new Set(b.platforms)] : [];
  const price = Number(b.pricePerVideo);
  const days = Number(b.deliveryDays);
  const revisions = Number(b.revisions);
  const maxVideos = Number(b.maxVideos);

  if (!title || title.length > SERVICE_TITLE_MAX) return { error: `Title is required (max ${SERVICE_TITLE_MAX} characters).` };
  if (!values(WORK_TYPES).includes(b.workType)) return { error: "Pick the type of work." };
  if (!platforms.length || platforms.some((p) => !values(PLATFORMS).includes(p))) return { error: "Pick at least one valid platform." };
  if (!values(VIDEO_LENGTHS).includes(b.videoLength)) return { error: "Pick the video length." };
  if (!description || description.length > SERVICE_DESCRIPTION_MAX) return { error: `Description is required (max ${SERVICE_DESCRIPTION_MAX} characters).` };
  if (!(price > 0) || price > 100000) return { error: "Price per video must be between 1 and 100000." };
  if (!values(DELIVERY_DAYS).includes(days)) return { error: "Pick a delivery time." };
  if (!values(REVISIONS).includes(revisions)) return { error: "Pick the number of revisions." };
  if (!Number.isInteger(maxVideos) || maxVideos < 1 || maxVideos > MAX_ORDER_VIDEOS) return { error: `Max videos per order must be 1–${MAX_ORDER_VIDEOS}.` };

  const raw = Array.isArray(b.samples) ? b.samples : [];
  if (raw.length > MAX_SAMPLES) return { error: `Add at most ${MAX_SAMPLES} sample videos.` };
  const samples = [];
  for (const url of raw) {
    const parsed = typeof url === "string" ? parseVideoUrl(url) : null;
    if (!parsed) return { error: "Sample videos must be TikTok, Reels, Shorts or Facebook links." };
    samples.push({ url: url.trim(), platform: parsed.platform });
  }

  return {
    data: { title, workType: b.workType, platforms, videoLength: b.videoLength, description, pricePerVideo: money(price), deliveryDays: days, revisions, maxVideos, samples },
  };
}

// ---- Writes -------------------------------------------------------------------

async function saveSamples(client, serviceId, samples) {
  await client.query("DELETE FROM service_samples WHERE service_id = $1", [serviceId]);
  for (const [i, s] of samples.entries()) {
    await client.query(
      "INSERT INTO service_samples (service_id, url, platform, sort_order) VALUES ($1, $2, $3, $4)",
      [serviceId, s.url, s.platform, i],
    );
  }
}

// Creates (no `id`) or updates a service and its samples in one transaction. Returns the id.
export async function saveService(freelancerId, d, id = null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const fields = [d.title, d.workType, d.platforms, d.videoLength, d.description, d.pricePerVideo, d.deliveryDays, d.revisions, d.maxVideos];
    let serviceId = id;
    if (id) {
      await client.query(
        `UPDATE services SET title = $2, work_type = $3, platforms = $4, video_length = $5, description = $6,
           price_per_video = $7, delivery_days = $8, revisions = $9, max_videos = $10, updated_at = NOW()
         WHERE id = $1`,
        [id, ...fields],
      );
    } else {
      const { rows } = await client.query(
        `INSERT INTO services (freelancer_id, title, work_type, platforms, video_length, description,
           price_per_video, delivery_days, revisions, max_videos)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [freelancerId, ...fields],
      );
      serviceId = rows[0].id;
    }
    await saveSamples(client, serviceId, d.samples);
    await client.query("COMMIT");
    return serviceId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function setServiceStatus(id, status) {
  await pool.query("UPDATE services SET status = $2, updated_at = NOW() WHERE id = $1", [id, status]);
}

// Orders already made keep their project (projects.service_id is set to NULL).
export async function deleteService(id) {
  await pool.query("DELETE FROM services WHERE id = $1", [id]);
}

// The owner id, or null. Used to authorize changes.
export async function getServiceOwner(id) {
  if (!/^\d+$/.test(String(id))) return null;
  const { rows } = await pool.query("SELECT id, freelancer_id, status FROM services WHERE id = $1", [id]);
  return rows[0] ?? null;
}

// ---- Reads --------------------------------------------------------------------

const SERVICE_COLUMNS = `
  s.id, s.title, s.work_type, s.platforms, s.video_length, s.description, s.price_per_video,
  s.delivery_days, s.revisions, s.max_videos, s.status, s.created_at, s.updated_at,
  u.id AS freelancer_id, u.username, u.display_name, u.headline, u.country, u.avatar_updated_at,
  u.created_at AS member_since, u.paypal_status, u.paypal_merchant_id, u.arc_wallet,
  (SELECT COUNT(*) FROM projects o JOIN proposals op ON op.project_id = o.id
   WHERE o.service_id = s.id AND op.status = 'accepted')::int AS order_count,
  (SELECT url FROM service_samples x WHERE x.service_id = s.id ORDER BY x.sort_order, x.id LIMIT 1) AS cover_url
`;

const toService = (r) => {
  // How the freelancer can be paid: PayPal, USDC on Arc (when set up here), or both.
  const paypalReady = r.paypal_status === "ready";
  const arcReady = Boolean(r.arc_wallet) && arcEnabled();
  return {
    id: r.id,
    title: r.title,
    workType: r.work_type,
    platforms: r.platforms,
    videoLength: r.video_length,
    description: r.description,
    pricePerVideo: Number(r.price_per_video),
    deliveryDays: r.delivery_days,
    revisions: r.revisions,
    maxVideos: r.max_videos,
    status: r.status,
    createdAt: r.created_at,
    orderCount: r.order_count,
    coverEmbedUrl: r.cover_url ? parseVideoUrl(r.cover_url)?.embedUrl ?? null : null,
    // Clients can only order from freelancers who can be paid.
    canOrder: r.status === "active" && (paypalReady || arcReady),
    arcReady,
    freelancer: {
      id: r.freelancer_id,
      username: r.username,
      displayName: r.display_name,
      headline: r.headline ?? "",
      country: r.country ? COUNTRIES.find((c) => c.value === r.country)?.label ?? r.country : null,
      avatarUrl: avatarUrlOf({ id: r.freelancer_id, avatar_updated_at: r.avatar_updated_at }),
      memberSince: r.member_since,
      // The PayPal button on the service page pays this merchant (not secret).
      paypalMerchantId: paypalReady ? r.paypal_merchant_id : null,
    },
  };
};

export const SERVICE_SORTS = {
  newest: "s.created_at DESC",
  // Most paid orders first (home page "Popular Services").
  popular: `(SELECT COUNT(*) FROM projects o JOIN proposals op ON op.project_id = o.id
             WHERE o.service_id = s.id AND op.status = 'accepted') DESC, s.created_at DESC`,
  "price-asc": "s.price_per_video ASC, s.created_at DESC",
  "price-desc": "s.price_per_video DESC, s.created_at DESC",
  fastest: "s.delivery_days ASC, s.created_at DESC",
};

export function parseServiceFilters(params) {
  const list = (key) => (params.get(key) || "").split(",").map((s) => s.trim()).filter(Boolean);
  const num = (key) => {
    const n = Number(params.get(key));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const page = Math.floor(Number(params.get("page")));
  return {
    q: (params.get("q") || "").trim().slice(0, 100),
    workTypes: known(WORK_TYPES, list("workType")),
    platforms: known(PLATFORMS, list("platform")),
    lengths: known(VIDEO_LENGTHS, list("length")),
    maxPrice: num("maxPrice"),
    maxDays: num("maxDays"),
    sort: params.get("sort") in SERVICE_SORTS ? params.get("sort") : "newest",
    page: page > 0 ? page : 1,
  };
}

// Active services for /services, newest first by default.
export async function searchServices(f) {
  const where = ["s.status = 'active'"];
  const args = [];
  const add = (sql, value) => {
    args.push(value);
    where.push(sql.replaceAll("?", `$${args.length}`));
  };
  if (f.q) add("(s.title ILIKE ? OR s.description ILIKE ? OR u.display_name ILIKE ?)", `%${f.q.replace(/[\\%_]/g, "\\$&")}%`);
  if (f.workTypes.length) add("s.work_type = ANY(?::text[])", f.workTypes);
  if (f.platforms.length) add("s.platforms && ?::text[]", f.platforms);
  if (f.lengths.length) add("s.video_length = ANY(?::text[])", f.lengths);
  if (f.maxPrice) add("s.price_per_video <= ?", f.maxPrice);
  if (f.maxDays) add("s.delivery_days <= ?", f.maxDays);

  args.push(SERVICES_PAGE_SIZE, (f.page - 1) * SERVICES_PAGE_SIZE);
  const { rows } = await pool.query(
    `SELECT ${SERVICE_COLUMNS}, COUNT(*) OVER() AS total
     FROM services s JOIN users u ON u.id = s.freelancer_id
     WHERE ${where.join(" AND ")}
     ORDER BY ${SERVICE_SORTS[f.sort]}
     LIMIT $${args.length - 1} OFFSET $${args.length}`,
    args,
  );
  return {
    services: rows.map(toService),
    total: rows[0] ? Number(rows[0].total) : 0,
    page: f.page,
    pageSize: SERVICES_PAGE_SIZE,
  };
}

// One service with its samples. Paused services are only visible to their owner.
export async function getService(id, viewer) {
  if (!/^\d+$/.test(String(id))) return null;
  const { rows } = await pool.query(
    `SELECT ${SERVICE_COLUMNS} FROM services s JOIN users u ON u.id = s.freelancer_id WHERE s.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const service = toService(rows[0]);
  const isOwner = viewer?.id === service.freelancer.id;
  if (service.status !== "active" && !isOwner) return null;
  const { rows: samples } = await pool.query(
    "SELECT url, platform FROM service_samples WHERE service_id = $1 ORDER BY sort_order, id",
    [id],
  );
  service.samples = samples.map((s) => ({ ...s, embedUrl: parseVideoUrl(s.url)?.embedUrl ?? null }));
  return { service, isOwner };
}

// Every service a freelancer offers, for /my-services.
export async function getOwnedServices(freelancerId) {
  const { rows } = await pool.query(
    `SELECT ${SERVICE_COLUMNS} FROM services s JOIN users u ON u.id = s.freelancer_id
     WHERE s.freelancer_id = $1 ORDER BY s.created_at DESC`,
    [freelancerId],
  );
  return rows.map(toService);
}

// The form's shape for /edit-service/{id}.
export async function getServiceForEdit(id, freelancerId) {
  const data = await getService(id, { id: freelancerId });
  if (!data?.isOwner) return null;
  const s = data.service;
  return {
    title: s.title,
    workType: s.workType,
    platforms: s.platforms,
    videoLength: s.videoLength,
    description: s.description,
    pricePerVideo: String(s.pricePerVideo),
    deliveryDays: s.deliveryDays,
    revisions: s.revisions,
    maxVideos: String(s.maxVideos),
    samples: s.samples,
  };
}

// ---- Ordering -----------------------------------------------------------------

export class OrderError extends Error {
  constructor(message, code = 409) {
    super(message);
    this.code = code;
  }
}

// Step 1 of ordering (step 2 is the PayPal button, POST /api/proposals/{id}/checkout).
// Creates — or reuses the client's unpaid order for this service — a private project
// and the freelancer's proposal at the service's price. Returns what the PayPal button needs.
export async function createServiceOrder(serviceId, viewer, body) {
  if (viewer?.accountType !== "client") throw new OrderError("Only client accounts can order services.", 403);
  const data = await getService(serviceId, viewer);
  if (!data) throw new OrderError("Service not found.", 404);
  const s = data.service;
  if (s.status !== "active") throw new OrderError("This service is paused.");
  if (!s.canOrder) throw new OrderError("This freelancer hasn't connected PayPal or an Arc wallet yet, so they can't take orders.");

  const videoCount = Number(body?.videoCount);
  const brief = typeof body?.brief === "string" ? body.brief.trim() : "";
  if (!Number.isInteger(videoCount) || videoCount < 1 || videoCount > s.maxVideos) {
    throw new OrderError(`Order 1–${s.maxVideos} videos.`, 400);
  }
  if (!brief || brief.length > SERVICE_BRIEF_MAX) throw new OrderError(`Describe what you need (max ${SERVICE_BRIEF_MAX} characters).`, 400);

  const deliveryDate = addDays(s.deliveryDays);
  const title = s.title.slice(0, 70); // projects.title is 70 characters
  const coverLetter = `Order for my service "${s.title}": ${videoCount} × video at $${s.pricePerVideo} each, delivered in ${s.deliveryDays} ${s.deliveryDays === 1 ? "day" : "days"}.`;

  let projectId;
  let proposalId;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // An earlier order the client didn't pay for is updated instead of piling up.
    const { rows: open } = await client.query(
      `SELECT p.id AS project_id, pr.id AS proposal_id FROM projects p
       JOIN proposals pr ON pr.project_id = p.id
       WHERE p.service_id = $1 AND p.client_id = $2 AND pr.status = 'pending'
       ORDER BY p.id DESC LIMIT 1`,
      [s.id, viewer.id],
    );
    projectId = open[0]?.project_id;
    proposalId = open[0]?.proposal_id;
    const projectFields = [title, s.platforms, s.workType, videoCount, s.videoLength, brief, deliveryDate, s.pricePerVideo];
    if (projectId) {
      await client.query(
        `UPDATE projects SET title = $2, platforms = $3, work_type = $4, video_count = $5, video_length = $6,
           brief = $7, deadline = $8, budget_per_video = $9, updated_at = NOW() WHERE id = $1`,
        [projectId, ...projectFields],
      );
      await client.query(
        "UPDATE proposals SET price_per_video = $2, delivery_date = $3, cover_letter = $4 WHERE id = $1",
        [proposalId, s.pricePerVideo, deliveryDate, coverLetter],
      );
    } else {
      // Closed: an order is not open to other freelancers' proposals.
      const { rows } = await client.query(
        `INSERT INTO projects (client_id, title, platforms, work_type, video_count, video_length, brief,
           deadline, budget_per_video, status, service_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'closed', $10) RETURNING id`,
        [viewer.id, ...projectFields, s.id],
      );
      projectId = rows[0].id;
      const res = await client.query(
        `INSERT INTO proposals (project_id, freelancer_id, price_per_video, delivery_date, cover_letter)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [projectId, s.freelancer.id, s.pricePerVideo, deliveryDate, coverLetter],
      );
      proposalId = res.rows[0].id;
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const blocker = hireBlocker({ status: "pending", deliveryDate, paypalStatus: "ready" });
  if (blocker) throw new OrderError(blocker);
  return {
    proposalId,
    projectId,
    amount: money(s.pricePerVideo * videoCount),
    deliveryDate,
  };
}
