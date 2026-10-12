import "server-only";
import {
  COUNTRIES,
  LANGUAGES,
  MIN_VIDEOS,
  NICHES,
  PLATFORMS,
  ROLES,
  TURNAROUND,
} from "@/data/talentOptions";
import pool from "@/lib/db";
import { avatarUrlOf, toVideo } from "@/lib/profile";

export const PAGE_SIZE = 12;

// True when all 10 required items are filled in. Only complete profiles of accounts that
// aren't hidden (db/013_hidden_accounts.sql) are listed; incomplete ones still have their page.
// Keep in sync with requiredChecks() in components/dashboard/profile/TalentProfile.jsx.
const COMPLETE = `(
  u.avatar_updated_at IS NOT NULL
  AND u.headline IS NOT NULL
  AND cardinality(u.roles) > 0
  AND u.country IS NOT NULL AND u.timezone IS NOT NULL
  AND cardinality(u.platforms) > 0
  AND cardinality(u.niches) > 0
  AND u.starting_price > 0
  AND u.turnaround_hours IS NOT NULL
  AND (SELECT COUNT(*) FROM portfolio_videos v WHERE v.user_id = u.id) >= ${MIN_VIDEOS}
)`;

// Profiles without a price or delivery time go last when sorting by them.
export const SORTS = {
  recommended: `${COMPLETE} DESC, (u.availability = 'available') DESC, u.updated_at DESC`,
  "price-asc": "u.starting_price ASC NULLS LAST, u.id",
  "price-desc": "u.starting_price DESC NULLS LAST, u.id",
  fastest: "u.turnaround_hours ASC NULLS LAST, u.starting_price ASC NULLS LAST",
  newest: "u.created_at DESC",
  // Most jobs completed on ShortWorks (home page "Top Freelancers"); there are no ratings yet.
  top: `completed_jobs DESC, ${COMPLETE} DESC, (u.availability = 'available') DESC, u.updated_at DESC`,
};

const PUBLIC_COLUMNS = `
  u.id, u.username, u.display_name, u.headline, u.bio, u.roles, u.country,
  u.timezone, u.languages, u.availability, u.platforms, u.niches, u.tools,
  u.starting_price, u.turnaround_hours, u.free_revisions, u.avatar_updated_at,
  u.created_at, u.account_type,
  (SELECT COUNT(*) FROM proposals pr
   WHERE pr.freelancer_id = u.id AND pr.status = 'accepted' AND pr.job_status = 'completed')::int AS completed_jobs
`;

// Only fields that are safe to show to anyone. No email, phone or PayPal.
const toPublicTalent = (row) => ({
  username: row.username,
  displayName: row.display_name,
  avatarUrl: avatarUrlOf(row),
  headline: row.headline ?? "",
  bio: row.bio ?? "",
  roles: row.roles,
  country: row.country,
  timezone: row.timezone,
  languages: row.languages,
  availability: row.availability,
  platforms: row.platforms,
  niches: row.niches,
  tools: row.tools,
  startingPrice: row.starting_price === null ? null : Number(row.starting_price),
  turnaroundHours: row.turnaround_hours,
  freeRevisions: row.free_revisions,
  memberSince: row.created_at,
  completedJobs: row.completed_jobs ?? 0,
});

// Keep only values we know, so the query never sees arbitrary input.
const known = (options, list) => {
  const allowed = options.map((o) => String(o.value));
  return (list ?? []).filter((v) => allowed.includes(v));
};
const positiveNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Turns raw query-string values into a clean filter object.
export function parseFilters(params) {
  const list = (key) =>
    (params.get(key) || "").split(",").map((s) => s.trim()).filter(Boolean);
  const turnaround = Number(params.get("maxDelivery"));
  const page = Math.floor(Number(params.get("page")));
  return {
    q: (params.get("q") || "").trim().slice(0, 100),
    roles: known(ROLES, list("role")),
    platforms: known(PLATFORMS, list("platform")),
    niches: known(NICHES, list("niche")),
    languages: known(LANGUAGES, list("language")),
    countries: known(COUNTRIES, list("country")),
    maxPrice: positiveNumber(params.get("maxPrice")),
    maxDelivery: TURNAROUND.some((t) => t.value === turnaround) ? turnaround : null,
    availableOnly: params.get("available") === "1",
    sort: params.get("sort") in SORTS ? params.get("sort") : "recommended",
    page: page > 0 ? page : 1,
  };
}

export async function searchTalents(f) {
  const where = ["u.account_type = 'freelancer'", "NOT u.hidden", COMPLETE];
  const values = [];
  // Every "?" in `sql` becomes the same numbered parameter holding `value`.
  const add = (sql, value) => {
    values.push(value);
    where.push(sql.replaceAll("?", `$${values.length}`));
  };

  if (f.q) {
    // Escape LIKE wildcards so "%" in a search means a literal percent sign.
    const like = `%${f.q.replace(/[\\%_]/g, "\\$&")}%`;
    add("(u.display_name ILIKE ? OR u.headline ILIKE ? OR u.username ILIKE ?)", like);
  }
  if (f.roles.length) add("u.roles && ?::text[]", f.roles);
  if (f.platforms.length) add("u.platforms && ?::text[]", f.platforms);
  if (f.niches.length) add("u.niches && ?::text[]", f.niches);
  if (f.languages.length) add("u.languages && ?::text[]", f.languages);
  if (f.countries.length) add("u.country = ANY(?::text[])", f.countries);
  if (f.maxPrice) add("u.starting_price <= ?", f.maxPrice);
  if (f.maxDelivery) add("u.turnaround_hours <= ?", f.maxDelivery);
  if (f.availableOnly) where.push("u.availability = 'available'");

  values.push(PAGE_SIZE, (f.page - 1) * PAGE_SIZE);
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}, COUNT(*) OVER() AS total
     FROM users u
     WHERE ${where.join(" AND ")}
     ORDER BY ${SORTS[f.sort]}
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );

  return {
    talents: rows.map(toPublicTalent),
    total: rows[0] ? Number(rows[0].total) : 0,
    page: f.page,
    pageSize: PAGE_SIZE,
  };
}

// Public profile page, for any account. `complete` and `isOwner` let the page
// nudge the owner to finish their profile.
export async function getPublicProfile(username, viewerId) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}, (${COMPLETE}) AS complete
     FROM users u WHERE LOWER(u.username) = LOWER($1)`,
    [username],
  );
  const row = rows[0];
  // Clients hire talent; they have no public talent page.
  if (!row || row.account_type !== "freelancer") return null;

  const isOwner = viewerId === row.id;

  const { rows: videos } = await pool.query(
    "SELECT * FROM portfolio_videos WHERE user_id = $1 ORDER BY sort_order, id",
    [row.id],
  );
  return {
    talent: toPublicTalent(row),
    videos: videos.map(toVideo),
    complete: row.complete,
    isOwner,
  };
}
