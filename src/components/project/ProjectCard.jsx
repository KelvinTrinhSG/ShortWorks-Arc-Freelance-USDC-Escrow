import { VIDEO_LENGTHS, WORK_TYPES } from "@/data/projectOptions";
import { PLATFORMS, labelOf } from "@/data/talentOptions";
import Link from "next/link";

export const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function timeAgo(iso, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

// Whole days from `today` to `date` (both yyyy-mm-dd).
export const daysUntil = (date, today) =>
  Math.round((Date.parse(date) - Date.parse(today)) / 86400000);

export function dueLabel(date, today) {
  const days = daysUntil(date, today);
  if (days > 1) return { text: `${days} days left`, className: "text-thm" };
  if (days === 1) return { text: "Due tomorrow", className: "text-warning" };
  if (days === 0) return { text: "Due today", className: "text-warning" };
  return { text: `${-days} ${days === -1 ? "day" : "days"} overdue`, className: "text-danger" };
}

// Badge in the top-right corner: where the logged-in freelancer stands on the project
// (project.myStatus from /api/projects). Colours: blue = waiting on you, grey = waiting
// on the client, green = hired, red = declined (by either side).
const MY_STATUS = {
  invited: { label: "Invited", color: "#1d4ed8", bg: "#e8efff" },
  submitted: { label: "Submitted", color: "#4b5563", bg: "#eef0f3" },
  accepted: { label: "Hired", color: "#15803d", bg: "#e3f6ea" },
  declined: { label: "Declined", color: "#b91c1c", bg: "#fdecec" },
  invite_declined: { label: "Invite declined", color: "#b91c1c", bg: "#fdecec" },
};

// How a project reads to a freelancer: scope, cost, time and quality at a glance.
// Works both for a saved project (has id, client, createdAt…) and for the live
// preview of a draft in the Create Project form, where those are missing.
// `ctaLabel`: the button text; clients can't send proposals, so they get "View Details".
export default function ProjectCard({ project, now, ctaLabel = "View & Send Proposal" }) {
  const count = Number(project.videoCount) || 0;
  const perVideo = Number(project.budgetPerVideo) || 0;
  const references = project.referenceCount ?? project.references?.length ?? 0;

  const scope = [
    project.workType && labelOf(WORK_TYPES, project.workType),
    project.platforms.length > 0 &&
      project.platforms.map((p) => labelOf(PLATFORMS, p)).join(", "),
    count > 0 &&
      `${count} × ${project.videoLength ? labelOf(VIDEO_LENGTHS, project.videoLength) : "?"}`,
  ].filter(Boolean);

  const terms = [
    perVideo > 0 &&
      `💰 $${perVideo}/video${count > 1 ? ` (total $${Math.round(perVideo * count * 100) / 100})` : ""}`,
    project.deadline && `⏰ Due ${formatDate(project.deadline)}`,
    references > 0 && `▶ ${references} reference ${references === 1 ? "video" : "videos"}`,
  ].filter(Boolean);

  const meta = [
    project.client?.displayName,
    project.createdAt && timeAgo(project.createdAt, now),
    project.proposalCount !== undefined &&
      `${project.proposalCount} ${project.proposalCount === 1 ? "proposal" : "proposals"}`,
  ].filter(Boolean);

  const title = project.title || "Untitled project";
  const href = project.id ? `/projects/${project.id}` : null;
  const status = MY_STATUS[project.myStatus];

  return (
    <div className="bdr1 bdrs8 p20 bgc-white hover-box-shadow h-100">
      <div className="d-flex align-items-start justify-content-between gap-2 mb10">
        <h5 className="mb-0">
          {href ? (
            <Link href={href} className="dark-color">
              {title}
            </Link>
          ) : (
            title
          )}
        </h5>
        {status && (
          <span
            className="badge rounded-pill fw500 flex-shrink-0"
            style={{ color: status.color, backgroundColor: status.bg, fontSize: 12, padding: "6px 12px" }}
          >
            {status.label}
          </span>
        )}
      </div>
      {meta.length > 0 && <p className="fz13 text mb10">{meta.join(" · ")}</p>}
      {scope.length > 0 && <p className="text-thm fz14 mb5">{scope.join(" · ")}</p>}
      {terms.length > 0 && <p className="fz14 dark-color mb0">{terms.join(" · ")}</p>}
      {href && project.brief && (
        <p
          className="fz14 text mt10 mb0"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {project.brief}
        </p>
      )}
      {href && (
        <Link href={href} className="ud-btn btn-light-thm mt15 d-inline-block">
          {ctaLabel} <i className="fal fa-arrow-right-long" />
        </Link>
      )}
    </div>
  );
}
