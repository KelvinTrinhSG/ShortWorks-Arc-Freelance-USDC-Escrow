"use client";
import { useIsLoggedIn } from "@/store/authStore";
import Link from "next/link";

// Mobile header: "Sign in" + "Join" for guests, "Dashboard" once logged in.
export default function SignInLink({ className = "" }) {
  const isLoggedIn = useIsLoggedIn();

  if (isLoggedIn) {
    return (
      <Link className={`${className} text-thm fw500`} href="/dashboard">
        Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link className={`${className} mr15`} href="/login">
        Sign in
      </Link>
      <Link className={`${className} text-thm fw500`} href="/register">
        Join
      </Link>
    </>
  );
}
