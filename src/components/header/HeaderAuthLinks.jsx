"use client";
import { useCurrentUser } from "@/store/authStore";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationBell from "./NotificationBell";

// Guests see "Sign in" + "Join"; logged-in users see their avatar and a "Dashboard" button styled like "Join".
export default function HeaderAuthLinks({ signInClassName, joinClassName }) {
  const user = useCurrentUser();
  const path = usePathname();

  if (user) {
    return (
      <>
        <div className="mr20">
          {/* login-info: white over the home hero, dark once the header turns white. */}
          <NotificationBell className="login-info" />
        </div>
        <Link className="header-avatar mr15" href="/my-profile">
          <Image
            height={44}
            width={44}
            style={{ objectFit: "cover" }}
            src={user.avatarUrl || "/images/resource/default-avatar.svg"}
            alt={user.displayName || "avatar"}
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
