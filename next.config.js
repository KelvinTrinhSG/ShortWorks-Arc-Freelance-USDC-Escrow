/** @type {import('next').NextConfig} */

// Old template-style URLs -> meaningful ones (renamed 2026-10). Permanent redirects
// keep bookmarks, shared links and old notifications working; query strings carry over.
const RENAMED = [
    ["/service-4", "/services"],
    ["/service-single/:id", "/services/:id"],
    ["/project-1", "/projects"],
    ["/project-single/:id", "/projects/:id"],
    ["/freelancer-1", "/freelancers"],
    ["/talents/:username", "/freelancers/:username"],
    ["/employee-1", "/employers"],
    ["/employee-single/:username", "/employers/:username"],
    ["/job-1", "/jobs"],
    ["/job-single/:id", "/jobs/:id"],
    ["/create-projects", "/projects/new"],
    ["/edit-project/:id", "/projects/:id/edit"],
    ["/add-services", "/services/new"],
    ["/edit-service/:id", "/services/:id/edit"],
    ["/manage-projects", "/my-projects"],
    ["/manage-services", "/my-services"],
    ["/manage-jobs", "/my-jobs"],
    ["/manage-jobs/:id", "/jobs/:id"],
    ["/proposal", "/my-proposals"],
];

// The site moved from the old Vercel name to shortworks.vercel.app (2026-10). Every page on the
// old name goes to the same path on the new one, except the PayPal webhook: PayPal doesn't follow
// redirects, so it keeps working until its URL is changed in the PayPal dashboard.
// Not permanent, so browsers don't cache it if the site moves again (e.g. to a bought domain).
const OLD_HOST = "pay-pal-short-work-project.vercel.app";
const SITE = "https://shortworks.vercel.app";

const nextConfig = {
    async redirects() {
        return [
            {
                source: "/:path((?!api/paypal/webhook$).*)",
                has: [{ type: "host", value: OLD_HOST }],
                destination: `${SITE}/:path`,
                permanent: false,
            },
            ...RENAMED.map(([source, destination]) => ({ source, destination, permanent: true })),
        ];
    },
};

module.exports = nextConfig;
