// Choices and limits for freelancer services (docs/services.md). Shared by the
// Add Service form, the services page filters and the API.
import { MAX_DELIVERY_DAYS } from "./projectOptions";

export const SERVICE_TITLE_MAX = 80;
export const SERVICE_DESCRIPTION_MAX = 1500;
export const MAX_SAMPLES = 3;
export const MAX_ORDER_VIDEOS = 50;
export const SERVICES_PAGE_SIZE = 12;

// Delivery time for a whole order. Capped by how long PayPal holds a payment.
export const DELIVERY_DAYS = [1, 2, 3, 5, 7, 10, 14, 21, MAX_DELIVERY_DAYS].map((d) => ({
  value: d,
  label: d === 1 ? "1 day" : `${d} days`,
}));

export const SERVICE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
];

// Filters on /service-4
export const MAX_PRICE_FILTERS = [
  { value: "25", label: "Up to $25 per video" },
  { value: "50", label: "Up to $50 per video" },
  { value: "100", label: "Up to $100 per video" },
  { value: "200", label: "Up to $200 per video" },
];

export const DELIVERY_FILTERS = [
  { value: "1", label: "Within 24 hours" },
  { value: "3", label: "Up to 3 days" },
  { value: "7", label: "Up to 7 days" },
  { value: "14", label: "Up to 14 days" },
];

export const SERVICE_BRIEF_MAX = 1000;
