import "server-only";
import { COUNTRIES, LANGUAGES } from "@/data/talentOptions";
import pool from "@/lib/db";
import { avatarUrlOf } from "@/lib/profile";
import { getClientOpenProjects } from "@/lib/projects";

// Employers = client accounts, for freelancers looking for work (/employee-1,
// /employee-single/{username}). Only public fields: no email, phone or PayPal.

export const EMPLOYERS_PAGE_SIZE = 12;

// Open = taking proposals: not closed, deadline ahead, nobody hired, not a private service order.
const OPEN_PROJECT = `p.service_id IS NULL AND p.status = 'open' AND p.deadline >= CURRENT_DATE
  AND NOT EXISTS (SELECT 1 FROM proposals a WHERE a.project_id = p.id AND a.status = 'accepted')`;

const EMPLOYER_COLUMNS = `
  u.id, u.username, u.display_name, u.headline, u.bio, u.country, u.languages,
  u.avatar_updated_at, u.created_at,
  (SELECT COUNT(*) FROM projects p WHERE p.client_id = u.id AND p.service_id IS NULL)::int AS projects_posted,
  (SELECT COUNT(*) FROM projects p WHERE p.client_id = u.id AND ${OPEN_PROJECT})::int AS open_projects,
  (SELECT COUNT(*) FROM proposals pr JOIN projects p ON p.id = pr.project_id
   WHERE p.client_id = u.id AND pr.status = 'accepted')::int AS hires,
  (SELECT COUNT(*) FROM proposals pr JOIN projects p ON p.id = pr.project_id
   WHERE p.client_id = u.id AND pr.status = 'accepted' AND pr.job_status = 'completed')::int AS jobs_completed
`;

const toEmployer = (r) => ({
  username: r.username,
  displayName: r.display_name,
  avatarUrl: avatarUrlOf({ id: r.id, avatar_updated_at: r.avatar_updated_at }),
  headline: r.headline ?? "",
  bio: r.bio ?? "",
  country: r.country ? COUNTRIES.find((c) => c.value === r.country)?.label ?? r.country : null,
  countryCode: r.country,
  languages: (r.languages ?? []).map((l) => LANGUAGES.find((x) => x.value === l)?.label ?? l),
  memberSince: r.created_at,
  projectsPosted: r.projects_posted,
  openProjects: r.open_projects,
  hires: r.hires,
  jobsCompleted: r.jobs_completed,
});

export const EMPLOYER_SORTS = {
  // Employers with work available right now first.
  "open-desc": "open_projects DESC, hires DESC, u.created_at DESC",
  "hires-desc": "hires DESC, open_projects DESC, u.created_at DESC",
  newest: "u.created_at DESC",
};

export function parseEmployerFilters(params) {
  const page = Math.floor(Number(params.get("page")));
  const countries = (params.get("country") || "")
    .split(",")
    .filter((c) => COUNTRIES.some((x) => x.value === c));
  return {
    q: (params.get("q") || "").trim().slice(0, 100),
    countries,
    hiringOnly: params.get("hiring") === "1",
    sort: params.get("sort") in EMPLOYER_SORTS ? params.get("sort") : "open-desc",
    page: page > 0 ? page : 1,
  };
}

export async function searchEmployers(f) {
  const where = ["u.account_type = 'client'"];
  const args = [];
  const add = (sql, value) => {
    args.push(value);
    where.push(sql.replaceAll("?", `$${args.length}`));
  };
  if (f.q) add("(u.display_name ILIKE ? OR u.username ILIKE ? OR u.headline ILIKE ?)", `%${f.q.replace(/[\\%_]/g, "\\$&")}%`);
  if (f.countries.length) add("u.country = ANY(?::text[])", f.countries);

  args.push(EMPLOYERS_PAGE_SIZE, (f.page - 1) * EMPLOYERS_PAGE_SIZE);
  // Wrapped so the sort and the "hiring now" filter can use the computed counts.
  const { rows } = await pool.query(
    `SELECT *, COUNT(*) OVER() AS total FROM (
       SELECT ${EMPLOYER_COLUMNS} FROM users u WHERE ${where.join(" AND ")}
     ) u
     ${f.hiringOnly ? "WHERE open_projects > 0" : ""}
     ORDER BY ${EMPLOYER_SORTS[f.sort]}
     LIMIT $${args.length - 1} OFFSET $${args.length}`,
    args,
  );
  return {
    employers: rows.map(toEmployer),
    total: rows[0] ? Number(rows[0].total) : 0,
    page: f.page,
    pageSize: EMPLOYERS_PAGE_SIZE,
  };
}

// One employer's public page with their open projects, or null (unknown or not a client).
export async function getEmployer(username) {
  const { rows } = await pool.query(
    `SELECT ${EMPLOYER_COLUMNS}, u.account_type FROM users u WHERE LOWER(u.username) = LOWER($1)`,
    [username],
  );
  const r = rows[0];
  if (!r || r.account_type !== "client") return null;
  return { employer: toEmployer(r), projects: await getClientOpenProjects(r.id) };
}
