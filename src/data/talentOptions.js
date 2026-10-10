// Choices for the short-form video talent profile (docs/my-profile.md).
// Shared by the profile form and, later, by the API to validate input.

export const ROLES = [
  { value: "editor", label: "Video Editor" },
  { value: "ugc", label: "UGC Creator" },
  { value: "scriptwriter", label: "Scriptwriter" },
  { value: "motion", label: "Motion Designer" },
  { value: "videographer", label: "Videographer" },
];
export const MAX_ROLES = 3;

export const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "reels", label: "Instagram Reels" },
  { value: "shorts", label: "YouTube Shorts" },
  { value: "facebook", label: "Facebook Reels" },
];

export const NICHES = [
  { value: "beauty", label: "Beauty" },
  { value: "food", label: "F&B" },
  { value: "tech", label: "Tech" },
  { value: "gaming", label: "Gaming" },
  { value: "education", label: "Education" },
  { value: "fashion", label: "Fashion" },
  { value: "real-estate", label: "Real estate" },
  { value: "travel", label: "Travel" },
  { value: "fitness", label: "Fitness" },
  { value: "finance", label: "Finance" },
];
export const MAX_NICHES = 5;

export const TOOLS = [
  { value: "capcut", label: "CapCut" },
  { value: "premiere", label: "Premiere Pro" },
  { value: "after-effects", label: "After Effects" },
  { value: "davinci", label: "DaVinci Resolve" },
  { value: "final-cut", label: "Final Cut Pro" },
  { value: "canva", label: "Canva" },
];

export const LANGUAGES = [
  { value: "vi", label: "Vietnamese" },
  { value: "en", label: "English" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "th", label: "Thai" },
  { value: "id", label: "Indonesian" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

export const COUNTRIES = [
  { value: "VN", label: "Vietnam" },
  { value: "SG", label: "Singapore" },
  { value: "TH", label: "Thailand" },
  { value: "PH", label: "Philippines" },
  { value: "ID", label: "Indonesia" },
  { value: "MY", label: "Malaysia" },
  { value: "IN", label: "India" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "AU", label: "Australia" },
  { value: "GB", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
];

export const TIMEZONES = [
  { value: "America/Los_Angeles", label: "GMT-8 · Los Angeles" },
  { value: "America/New_York", label: "GMT-5 · New York" },
  { value: "Europe/London", label: "GMT+0 · London" },
  { value: "Europe/Berlin", label: "GMT+1 · Berlin" },
  { value: "Asia/Kolkata", label: "GMT+5:30 · India" },
  { value: "Asia/Bangkok", label: "GMT+7 · Bangkok, Jakarta" },
  { value: "Asia/Ho_Chi_Minh", label: "GMT+7 · Ho Chi Minh City" },
  { value: "Asia/Singapore", label: "GMT+8 · Singapore, Manila" },
  { value: "Asia/Tokyo", label: "GMT+9 · Tokyo, Seoul" },
  { value: "Australia/Sydney", label: "GMT+10 · Sydney" },
];

export const AVAILABILITY = [
  { value: "available", label: "🟢 Available for work" },
  { value: "busy", label: "🟡 Busy" },
  { value: "away", label: "⚪ Away" },
];

// Hours, so the API can store a single integer.
export const TURNAROUND = [
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
  { value: 72, label: "3 days" },
  { value: 120, label: "5 days" },
  { value: 168, label: "7 days" },
];

// -1 = unlimited (null means the user has not picked yet)
export const REVISIONS = [
  { value: 0, label: "No free revisions" },
  { value: 1, label: "1 revision" },
  { value: 2, label: "2 revisions" },
  { value: 3, label: "3 revisions" },
  { value: -1, label: "Unlimited" },
];

export const VIDEO_ROLES = [
  { value: "editing", label: "Editing" },
  { value: "filming", label: "Filming" },
  { value: "script", label: "Script" },
  { value: "on-camera", label: "On-camera (UGC)" },
  { value: "motion", label: "Motion graphics" },
];

export const MIN_VIDEOS = 3;
export const MAX_VIDEOS = 6;
export const HEADLINE_MAX = 70;
export const BIO_MAX = 300;
export const AVATAR_MAX_BYTES = 1024 * 1024;

// Label for a stored value, e.g. labelOf(NICHES, "food") -> "F&B".
export const labelOf = (options, value) =>
  options.find((o) => o.value === value)?.label ?? value;

// Chosen on the Register page. Only freelancers are listed as talent.
export const ACCOUNT_TYPES = [
  { value: "client", label: "Hire A Freelancer" },
  { value: "freelancer", label: "Become a Freelancer" },
];
