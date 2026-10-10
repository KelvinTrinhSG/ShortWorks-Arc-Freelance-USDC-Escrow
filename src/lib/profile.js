import "server-only";
import {
  AVAILABILITY,
  BIO_MAX,
  COUNTRIES,
  HEADLINE_MAX,
  LANGUAGES,
  MAX_NICHES,
  MAX_ROLES,
  MAX_VIDEOS,
  NICHES,
  PLATFORMS,
  REVISIONS,
  ROLES,
  TIMEZONES,
  TOOLS,
  TURNAROUND,
  VIDEO_ROLES,
} from "@/data/talentOptions";
import { parseVideoUrl } from "@/lib/videoUrl";

// Versioned so browsers can cache the image until the user uploads a new one.
export const avatarUrlOf = (row) =>
  row.avatar_updated_at
    ? `/api/avatar/${row.id}?v=${new Date(row.avatar_updated_at).getTime()}`
    : null;

// Fields every logged-in page needs (header avatar, name).
export const toSessionUser = (row) => ({
  id: row.id,
  displayName: row.display_name,
  username: row.username,
  accountType: row.account_type,
  email: row.email,
  avatarUrl: avatarUrlOf(row),
});

export const toProfile = (row) => ({
  ...toSessionUser(row),
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
  phone: row.phone ?? "",
  paypalEmail: row.paypal_email ?? "",
});

export const toVideo = (row) => ({
  id: row.id,
  url: row.url,
  platform: row.platform,
  embedUrl: parseVideoUrl(row.url)?.embedUrl ?? null,
  niche: row.niche,
  role: row.role,
  result: row.result ?? "",
});

const valuesOf = (options) => options.map((o) => o.value);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-.\s]*$/;

// Each rule turns raw input into a DB value, or throws a message for the user.
const text = (max, { required } = {}) => (v) => {
  if (v !== null && v !== undefined && typeof v !== "string") throw "must be text";
  const s = (v ?? "").trim();
  if (required && !s) throw "is required";
  if (s.length > max) throw `must be at most ${max} characters`;
  return s || null;
};

const oneOf = (options, { required } = {}) => (v) => {
  if (v === null || v === undefined || v === "") {
    if (required) throw "is required";
    return null;
  }
  if (!valuesOf(options).includes(v)) throw "is not a valid choice";
  return v;
};

const manyOf = (options, max) => (v) => {
  if (!Array.isArray(v)) throw "must be a list";
  const allowed = valuesOf(options);
  const unique = [...new Set(v)];
  if (unique.some((x) => !allowed.includes(x))) throw "has an invalid choice";
  if (max && unique.length > max) throw `allows at most ${max} choices`;
  return unique;
};

const price = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 100000) {
    throw "must be a number between 1 and 100000";
  }
  return Math.round(n * 100) / 100;
};

const optionalEmail = (v) => {
  const s = text(255)(v);
  if (s && !EMAIL_RE.test(s)) throw "must be a valid email";
  return s;
};

const phone = (v) => {
  const s = text(30)(v);
  if (s && !PHONE_RE.test(s)) throw "may only contain digits, spaces and + ( ) -";
  return s;
};

// API field -> [DB column, rule, label shown in errors]
const PROFILE_FIELDS = {
  displayName: ["display_name", text(100, { required: true }), "Display name"],
  headline: ["headline", text(HEADLINE_MAX), "Headline"],
  bio: ["bio", text(BIO_MAX), "Short bio"],
  roles: ["roles", manyOf(ROLES, MAX_ROLES), "Main role"],
  country: ["country", oneOf(COUNTRIES), "Country"],
  timezone: ["timezone", oneOf(TIMEZONES), "Time zone"],
  languages: ["languages", manyOf(LANGUAGES), "Languages"],
  availability: ["availability", oneOf(AVAILABILITY, { required: true }), "Availability"],
  platforms: ["platforms", manyOf(PLATFORMS), "Platforms"],
  niches: ["niches", manyOf(NICHES, MAX_NICHES), "Niches"],
  tools: ["tools", manyOf(TOOLS), "Tools"],
  startingPrice: ["starting_price", price, "Starting price"],
  turnaroundHours: ["turnaround_hours", oneOf(TURNAROUND), "Delivery time"],
  freeRevisions: ["free_revisions", oneOf(REVISIONS), "Free revisions"],
  phone: ["phone", phone, "Phone number"],
  paypalEmail: ["paypal_email", optionalEmail, "PayPal email"],
};

// Validates only the fields present in `body`, so callers can send a subset.
// Returns { columns: { db_column: value }, errors: { field: message } }.
export function validateProfile(body) {
  const columns = {};
  const errors = {};
  for (const [field, [column, rule, label]] of Object.entries(PROFILE_FIELDS)) {
    if (!(field in body)) continue;
    try {
      columns[column] = rule(body[field]);
    } catch (message) {
      errors[field] = `${label} ${message}.`;
    }
  }
  return { columns, errors };
}

// Returns { videos: [...clean rows], error: string | null }.
export function validateVideos(list) {
  if (!Array.isArray(list)) return { videos: [], error: "Videos must be a list." };
  if (list.length > MAX_VIDEOS) {
    return { videos: [], error: `You can add at most ${MAX_VIDEOS} videos.` };
  }

  const videos = [];
  for (const [i, v] of list.entries()) {
    const n = i + 1;
    const parsed = typeof v?.url === "string" ? parseVideoUrl(v.url) : null;
    if (!parsed) {
      return { videos: [], error: `Video ${n}: use a TikTok, Reels, Shorts or Facebook link.` };
    }
    try {
      videos.push({
        url: v.url.trim(),
        platform: parsed.platform, // from the URL, not trusted from the client
        niche: oneOf(NICHES, { required: true })(v.niche),
        role: oneOf(VIDEO_ROLES)(v.role),
        result: text(60)(v.result),
      });
    } catch (message) {
      return { videos: [], error: `Video ${n}: niche or role ${message}.` };
    }
  }
  return { videos, error: null };
}
