import { VIDEO_LENGTHS, WORK_TYPES } from "@/data/projectOptions";
import { PLATFORMS, labelOf } from "@/data/talentOptions";
import Link from "next/link";
import { dueLabel, formatDate } from "./ProjectCard";

// Badge per job status. "overdue" = in progress past the delivery date (see jobStage).
const STAGES = {
  in_progress: { label: "In progress", color: "#1d4ed8", bg: "#e8efff" },
  overdue: { label: "Overdue", color: "#b91c1c", bg: "#fdecec" },
  submitted: { label: "Submitted", color: "#a16207", bg: "#fdf6e3" },
  completed: { label: "Completed", color: "#15803d", bg: "#e3f6ea" },
  disputed: { label: "Disputed", color: "#b91c1c", bg: "#fdecec" },
  cancelled: { label: "Cancelled", color: "#4b5563", bg: "#eef0f3" },
};

export const jobStage = (status, deliveryDate, today) =>
  status === "in_progress" && deliveryDate < today ? "overdue" : status;

export function JobStatusBadge({ status, deliveryDate, today }) {
  const s = STAGES[jobStage(status, deliveryDate, today)] ?? STAGES.in_progress;
  return (
    <span
      className="badge rounded-pill fw500 flex-shrink-0"
      style={{ color: s.color, backgroundColor: s.bg, fontSize: 12, padding: "6px 12px" }}
    >
      {s.label}
    </span>
  );
}

// One job on /job-1. Both sides manage it on /job-single/{id}.
export default function JobCard({ job, isClient, today }) {
  const due = dueLabel(job.deliveryDate, today);
  const href = `/job-single/${job.id}`;
  const open = job.jobStatus === "in_progress" || job.jobStatus === "submitted";

  const scope = [
    labelOf(WORK_TYPES, job.workType),
    job.platforms.map((p) => labelOf(PLATFORMS, p)).join(", "),
    `${job.videoCount} × ${labelOf(VIDEO_LENGTHS, job.videoLength)}`,
  ];

  return (
    <div className="bdr1 bdrs8 p20 bgc-white hover-box-shadow h-100">
      <div className="d-flex align-items-start justify-content-between gap-2 mb10">
        <h5 className="mb-0">
          <Link href={href} className="dark-color">
            {job.title}
          </Link>
        </h5>
        <JobStatusBadge status={job.jobStatus} deliveryDate={job.deliveryDate} today={today} />
      </div>
      <p className="fz13 text mb10">
        {isClient ? (
          <>
            Freelancer:{" "}
            <Link href={`/talents/${job.freelancer.username}`} className="text-thm">
              {job.freelancer.displayName}
            </Link>
          </>
        ) : (
          `Client: ${job.clientName}`
        )}
      </p>
      <p className="text-thm fz14 mb5">{scope.join(" · ")}</p>
      <p className="fz14 dark-color mb0">
        💰 ${job.pricePerVideo}/video
        {job.videoCount > 1 ? ` (total $${job.total})` : ""} · ⏰ Delivery{" "}
        {formatDate(job.deliveryDate)}
        {open && <span className={due.className}> ({due.text})</span>}
      </p>
      <Link href={href} className="ud-btn btn-light-thm mt15 d-inline-block">
        Manage Job <i className="fal fa-arrow-right-long" />
      </Link>
    </div>
  );
}
