import { parseServiceFilters, saveService, searchServices, validateService } from "@/lib/services";
import { getViewer } from "@/lib/viewer";

// Public list of active services.
// GET /api/services?q=&workType=&platform=&length=&maxPrice=&maxDays=&sort=&page=
export async function GET(request) {
  return Response.json(await searchServices(parseServiceFilters(request.nextUrl.searchParams)));
}

// Create a service. Freelancer accounts only.
export async function POST(request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Please log in again." }, { status: 401 });
  if (viewer.accountType !== "freelancer") {
    return Response.json({ error: "Only freelancer accounts can offer services." }, { status: 403 });
  }
  const { data, error } = validateService(await request.json().catch(() => null));
  if (error) return Response.json({ error }, { status: 400 });
  const id = await saveService(viewer.id, data);
  return Response.json({ id }, { status: 201 });
}
