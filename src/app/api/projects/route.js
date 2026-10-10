import {
  createProject,
  parseProjectFilters,
  searchProjects,
  validateProject,
} from "@/lib/projects";
import { getViewer } from "@/lib/viewer";

// Public list of open projects. For a logged-in freelancer each project also
// carries `myStatus` (their proposal / invitation), shown as a badge on the card.
// GET /api/projects?q=&platform=tiktok,reels&workType=&length=&minBudget=&sort=&page=
export async function GET(request) {
  const filters = parseProjectFilters(request.nextUrl.searchParams);
  const viewer = await getViewer();
  const freelancerId = viewer?.accountType === "freelancer" ? viewer.id : null;
  return Response.json(await searchProjects(filters, freelancerId));
}

// Post a project. Client accounts only.
export async function POST(request) {
  const viewer = await getViewer();
  if (!viewer) {
    return Response.json({ error: "Please log in again." }, { status: 401 });
  }
  if (viewer.accountType !== "client") {
    return Response.json(
      { error: "Only client accounts can post projects." },
      { status: 403 },
    );
  }

  const { data, error } = validateProject(await request.json().catch(() => null));
  if (error) return Response.json({ error }, { status: 400 });

  const id = await createProject(viewer.id, data);
  return Response.json({ id }, { status: 201 });
}
