"use client";
import { useIsLoggedIn } from "@/store/authStore";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Guests see "Sign in" + "Join"; logged-in users see their avatar and a "Dashboard" button styled like "Join".
export default function HeaderAuthLinks({ signInClassName, joinClassName }) {
  const isLoggedIn = useIsLoggedIn();
  const path = usePathname();

  if (isLoggedIn) {
    return (
      <>
        <Link className="header-avatar mr15" href="/my-profile">
          <Image
            height={44}
            width={44}
            src="/images/resource/default-avatar.svg"
            alt="avatar"
            unoptimized
          />
        </Link>
        <Link className={joinClassName} href="/dashboard">
          Dashboard
        </Link>
      </>
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
