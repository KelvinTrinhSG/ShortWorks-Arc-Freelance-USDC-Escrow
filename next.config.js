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

const nextConfig = {
    async redirects() {
        return RENAMED.map(([source, destination]) => ({ source, destination, permanent: true }));
    },
};

module.exports = nextConfig;
