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

// Every route under src/app/(dashboard), plus job pages and the admin area.
// Old URLs (/manage-jobs, /create-projects…) redirect to these first (next.config.js).
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/new",
    "/projects/:id/edit",
    "/services/new",
    "/services/:id/edit",
    "/my-projects/:path*",
    "/my-services/:path*",
    "/my-jobs/:path*",
    "/my-proposals/:path*",
    "/jobs/:id", // not a dashboard page, but only for the two sides of a job (/jobs itself is public)
    "/invitations/:path*",
    "/invoice/:path*",
    "/admin/:path*",
    "/message/:path*",
    "/my-profile/:path*",
    "/payouts/:path*",
    "/pay-with-arc",
    "/paypal", // not /paypal-connected: that page only closes the PayPal popup
    "/reviews/:path*",
    "/saved/:path*",
    "/statements/:path*",
  ],
};
