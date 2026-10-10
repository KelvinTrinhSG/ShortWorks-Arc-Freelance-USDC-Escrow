import { NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

// Send guests who open a dashboard page to /login, then back here after login.
export async function proxy(request) {
  const session = await decrypt(request.cookies.get("session")?.value);
  if (session) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

// Every route under src/app/(dashboard).
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/edit-project/:path*",
    "/add-services/:path*",
    "/create-projects/:path*",
    "/invitations/:path*",
    "/invoice/:path*",
    "/manage-jobs/:path*",
    "/manage-projects/:path*",
    "/manage-services/:path*",
    "/message/:path*",
    "/my-profile/:path*",
    "/payouts/:path*",
    "/proposal/:path*",
    "/reviews/:path*",
    "/saved/:path*",
    "/statements/:path*",
  ],
};
