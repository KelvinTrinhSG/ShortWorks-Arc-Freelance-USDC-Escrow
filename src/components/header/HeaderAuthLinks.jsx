"use client";
import { useIsLoggedIn } from "@/store/authStore";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Guests see "Sign in" + "Join"; logged-in users see a "Dashboard" button styled like "Join".
export default function HeaderAuthLinks({ signInClassName, joinClassName }) {
  const isLoggedIn = useIsLoggedIn();
  const path = usePathname();

  if (isLoggedIn) {
    return (
      <Link className={joinClassName} href="/dashboard">
        Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        className={`${signInClassName} ${path === "/login" ? "ui-active" : ""}`}
        href="/login"
      >
        Sign in
      </Link>
      <Link className={joinClassName} href="/register">
        Join
      </Link>
    </>
  );
}
