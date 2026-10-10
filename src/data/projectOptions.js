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

export const PROJECT_TITLE_MAX = 70;
export const BRIEF_MAX = 1000;
export const MIN_VIDEO_COUNT = 1;
export const MAX_VIDEO_COUNT = 50;
export const MAX_REFERENCES = 3;

export const COVER_LETTER_MAX = 1500;
export const PROJECTS_PAGE_SIZE = 10;
