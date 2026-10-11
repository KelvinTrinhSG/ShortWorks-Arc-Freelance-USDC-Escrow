import { parseJobFilters, searchJobs } from "@/lib/jobs";
import { getViewer } from "@/lib/viewer";

// The logged-in user's jobs (accepted proposals): a freelancer's own jobs,
// or the freelancers a client hired on their projects.
// GET /api/jobs?q=&platform=&workType=&length=&status=active,overdue&minPrice=&sort=&page=
export async function GET(request) {
  const viewer = await getViewer();
  if (!viewer) {
    return Response.json({ error: "Please log in to see your jobs." }, { status: 401 });
  }
  const filters = parseJobFilters(request.nextUrl.searchParams);
  return Response.json(await searchJobs(filters, viewer));
}
