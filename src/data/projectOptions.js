// Choices for the client "Create Project" form (8 fields, see docs/create-project.md).
// Shared by the form and, later, by the API to validate input.

export const WORK_TYPES = [
  { value: "editing", label: "Video editing" },
  { value: "ugc", label: "UGC filming" },
  { value: "motion", label: "Motion graphics" },
];

export const VIDEO_LENGTHS = [
  { value: "0-15", label: "Up to 15s" },
  { value: "15-30", label: "15–30s" },
  { value: "30-60", label: "30–60s" },
  { value: "60-90", label: "60–90s" },
  { value: "90-180", label: "1.5–3 min" },
];

// Where a freelancer stands on a project (project.myStatus). "none" = no proposal,
// no invitation. Used by the Status filter on /project-1; badge colours live in ProjectCard.
export const MY_STATUSES = [
  { value: "none", label: "Not applied" },
  { value: "invited", label: "Invited" },
  { value: "submitted", label: "Submitted" },
  { value: "declined", label: "Declined" },
  { value: "invite_declined", label: "Invite declined" },
];

// Where a job stands (proposals.job_status, docs/jobs.md). "overdue" is not stored:
// it is an in-progress job past the freelancer's delivery date. Status filter on /job-1.
export const JOB_STATUSES = [
  { value: "in_progress", label: "In progress" },
  { value: "overdue", label: "Overdue" },
  { value: "submitted", label: "Submitted" },
  { value: "completed", label: "Completed" },
  { value: "disputed", label: "Disputed" },
];

export const DISPUTE_REASONS = [
  { value: "late", label: "Not delivered on time" },
  { value: "quality", label: "Work doesn't match the brief" },
  { value: "unresponsive", label: "The other side isn't responding" },
  { value: "scope_change", label: "Scope changed after hiring" },
  { value: "payment", label: "Payment problem" },
  { value: "other", label: "Something else" },
];

export const JOB_NOTE_MAX = 1000;

export const PROJECT_TITLE_MAX = 70;
export const BRIEF_MAX = 1000;
export const MIN_VIDEO_COUNT = 1;
export const MAX_VIDEO_COUNT = 50;
export const MAX_REFERENCES = 3;

export const COVER_LETTER_MAX = 1500;
export const PROJECTS_PAGE_SIZE = 10;
