import { parseFilters, searchTalents } from "@/lib/talents";

// Public talent directory.
// GET /api/talents?q=&role=editor,ugc&platform=&niche=&language=&country=
//                 &maxPrice=&maxDelivery=&available=1&sort=&page=
export async function GET(request) {
  const filters = parseFilters(request.nextUrl.searchParams);
  return Response.json(await searchTalents(filters));
}
