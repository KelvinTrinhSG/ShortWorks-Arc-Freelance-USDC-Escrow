import { parseEmployerFilters, searchEmployers } from "@/lib/employers";

// Public list of employers (client accounts).
// GET /api/employers?q=&country=VN,SG&hiring=1&sort=open-desc|hires-desc|newest&page=
export async function GET(request) {
  return Response.json(await searchEmployers(parseEmployerFilters(request.nextUrl.searchParams)));
}
