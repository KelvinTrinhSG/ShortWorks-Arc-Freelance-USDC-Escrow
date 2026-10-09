"use client";
import { useIsLoggedIn } from "@/store/authStore";
import Link from "next/link";
import { usePathname } from "next/navigation";

// "Sign in" for guests, "Dashboard" once logged in.
export default function SignInLink({ className = "", signInText = "Sign in", dashboardText = "Dashboard" }) {
  const isLoggedIn = useIsLoggedIn();
  const path = usePathname();
  const href = isLoggedIn ? "/dashboard" : "/login";

  return (
    <Link
      className={`${className} ${path === href ? "ui-active" : ""}`}
      href={href}
    >
      {isLoggedIn ? dashboardText : signInText}
    </Link>
  );
}
