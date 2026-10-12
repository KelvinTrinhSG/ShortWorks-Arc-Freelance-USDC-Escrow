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
// no invitation. Used by the Status filter on /projects; badge colours live in ProjectCard.
export const MY_STATUSES = [
  { value: "none", label: "Not applied" },
  { value: "invited", label: "Invited" },
  { value: "submitted", label: "Submitted" },
  { value: "declined", label: "Declined" },
  { value: "invite_declined", label: "Invite declined" },
];

// Where a job stands (proposals.job_status, docs/jobs.md). "overdue" is not stored:
// it is an in-progress job past the freelancer's delivery date. Status filter on /jobs.
export const JOB_STATUSES = [
  { value: "in_progress", label: "In progress" },
  { value: "overdue", label: "Overdue" },
  { value: "submitted", label: "Submitted" },
  { value: "completed", label: "Completed" },
  { value: "disputed", label: "Disputed" },
  { value: "cancelled", label: "Cancelled" },
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

// ---- Payments (docs/payments.md §11) -------------------------------------------

// Delivery at most this many days after hiring: a PayPal authorization lasts 29 days,
// which leaves room for the 48-hour review and auto-approval.
export const MAX_DELIVERY_DAYS = 25;
// A submitted job is approved automatically after this many hours without an answer.
// The cron runs once a day, so in practice it happens at the first run after that.
export const AUTO_APPROVE_HOURS = 48;
// ShortWorks decides a dispute within this many hours (every day counts).
export const DISPUTE_DECISION_HOURS = 48;
// Arc escrow (docs/arc-payments.md §5): this many days after delivery + review, the client can take
// the USDC back on-chain without ShortWorks (unless a dispute is open). A safety net only.
export const ARC_RECLAIM_BUFFER_DAYS = 14;

// The platform fee comes out of the freelancer's side, so does PayPal's fee.
// Fixed when a job is hired (job_payments.platform_fee, Arc Terms): changing it only affects new hires.
export const PLATFORM_FEE_PERCENT = 5;
// Only for the "You receive ≈" estimate: the real PayPal fee is known after capture.
// Sandbox charged $0.64 on $10; re-check against PayPal's live rates (docs/payments.md §11).
const PAYPAL_FEE_ESTIMATE = { percent: 3.49, fixed: 0.29 };

const cents = (n) => Math.round(n * 100) / 100;
export const platformFeeFor = (amount) => cents((amount * PLATFORM_FEE_PERCENT) / 100);

// What a freelancer gets for a job of `amount` (what the client pays).
export function estimateEarnings(amount) {
  const platformFee = platformFeeFor(amount);
  const paypalFee = amount > 0 ? cents((amount * PAYPAL_FEE_ESTIMATE.percent) / 100 + PAYPAL_FEE_ESTIMATE.fixed) : 0;
  return { amount: cents(amount), platformFee, paypalFee, net: Math.max(0, cents(amount - platformFee - paypalFee)) };
}

export const PROJECT_TITLE_MAX = 70;
export const BRIEF_MAX = 1000;
// A posted project is exactly one video, so the freelancer is paid as soon as it's approved.
// Projects posted before this rule (and service orders) may have more; they keep their count.
export const PROJECT_VIDEO_COUNT = 1;
export const MAX_REFERENCES = 3;

export const COVER_LETTER_MAX = 1500;
export const PROJECTS_PAGE_SIZE = 10;
