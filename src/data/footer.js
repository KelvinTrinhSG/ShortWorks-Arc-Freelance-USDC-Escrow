export const about = [
  { id: 1, name: "Careers", path: "/" },
  { id: 2, name: "Press & News", path: "/" },
  { id: 3, name: "Partnerships", path: "/" },
  { id: 4, name: "Privacy Policy", path: "/" },
  { id: 5, name: "Terms of Service", path: "/" },
  { id: 6, name: "Investor Relations", path: "/" },
];

export const category = [
  { id: 1, name: "Graphics & Design", path: "/" },
  { id: 2, name: "Digital Marketing", path: "/" },
  { id: 3, name: "Writing & Translation", path: "/" },
  { id: 4, name: "Video & Animation", path: "/" },
  { id: 5, name: "Music & Audio", path: "/" },
  { id: 6, name: "Programming & Tech", path: "/" },
  { id: 7, name: "Data", path: "/" },
  { id: 8, name: "Business", path: "/" },
  { id: 9, name: "Lifestyle", path: "/" },
];

export const support = [
  { id: 1, name: "Help & Support", path: "/" },
  { id: 2, name: "Trust & Safety", path: "/" },
  { id: 3, name: "Selling on ShortWorks", path: "/" },
  { id: 4, name: "Buying on ShortWorks", path: "/" },
  { id: 5, name: "Contact", path: "/contact" },
];

export const momney = ["US$ USD", "Euro", "Pound"];
export const lan = ["English", "Frenc", "Italian", "Spanish", "Turkey"];

export const footer = [
  "/dashboard",
  "/my-proposals",
  "/saved",
  "/message",
  "/reviews",
  "/invoice",
  "/payouts",
  "/statements",
  "/my-services",
  "/my-jobs",
  "/my-projects",
  "/my-profile",
  "/services/new",
  "/projects/new",
];

// ---- ShortWorks footer (components/footer/SiteFooter.jsx) ----
// The template lists above stay for the demo home pages' footers.

export const footerLegal = [
  { name: "Terms of Service", path: "/terms" },
  { name: "Privacy Policy", path: "/privacy" },
];

export const footerColumns = [
  {
    title: "ShortWorks",
    links: [
      { name: "How it works", path: "/terms#payments" },
      { name: "Disputes", path: "/terms#disputes" },
    ],
  },
  {
    title: "Explore",
    links: [
      { name: "Video editing", path: "/services?workType=editing" },
      { name: "UGC filming", path: "/services?workType=ugc" },
      { name: "Motion graphics", path: "/services?workType=motion" },
      { name: "Browse Services", path: "/services" },
      { name: "Find Projects", path: "/projects" },
      { name: "Find Freelancers", path: "/freelancers" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Trust & Safety", path: "/terms#payments" },
      { name: "Selling on ShortWorks", path: "/services/new" },
      { name: "Buying on ShortWorks", path: "/projects/new" },
      { name: "Contact", path: "/contact" },
    ],
  },
];
