"use client";
import { timeAgo } from "@/components/project/ProjectCard";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// { notifications, unread, now } or null when the request fails (e.g. logged out).
async function fetchNotifications() {
  const res = await fetch("/api/notifications").catch(() => null);
  if (!res?.ok) return null;
  return { ...(await res.json()), now: Date.now() };
}

// Bell with an unread badge and a dropdown of the latest notifications.
// Opening it marks everything read; unread items stay highlighted until it closes.
// `className` sets the icon colour to match the header it sits in.
export default function NotificationBell({ className = "" }) {
  const [data, setData] = useState(null); // { notifications, unread, now }
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = () =>
    fetchNotifications().then((next) => {
      if (next) setData(next);
      return next;
    });

  // Load on mount and whenever the tab gets focus again.
  useEffect(() => {
    const refresh = () => fetchNotifications().then((next) => next && setData(next));
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    const fresh = await load();
    if (fresh?.unread) {
      await fetch("/api/notifications", { method: "POST" }).catch(() => null);
      setData((prev) => prev && { ...prev, unread: 0 });
    }
  };

  const unread = data?.unread ?? 0;
  const items = data?.notifications ?? [];

  return (
    <div ref={ref} className="position-relative">
      <button
        type="button"
        onClick={toggle}
        className={`btn p-0 border-0 position-relative lh-1 ${className}`}
        style={{ fontSize: 20 }}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <span className="flaticon-notification" />
        {unread > 0 && (
          <span
            className="position-absolute badge rounded-pill bg-danger"
            style={{ top: -8, right: -10, fontSize: 10, padding: "3px 6px" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="position-absolute bgc-white bdrs12 text-start"
          style={{
            right: -12,
            top: "calc(100% + 14px)",
            width: 340,
            maxWidth: "calc(100vw - 30px)",
            zIndex: 1050,
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.12)",
          }}
        >
          <div className="px-4 pt15 pb10 bdrb1">
            <h6 className="mb-0">Notifications</h6>
          </div>
          {items.length === 0 ? (
            <p className="text fz14 px-4 py-4 mb-0 text-center">
              {data ? "No notifications yet." : "Loading..."}
            </p>
          ) : (
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {items.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="d-flex align-items-start gap-2 px-4 py-2 bdrb1"
                  // width: the dashboard header CSS sizes every link in it to 44px.
                  style={{ width: "auto", backgroundColor: n.read ? undefined : "#f0faf3" }}
                >
                  <Image
                    src={n.actor.avatarUrl || "/images/resource/default-avatar.svg"}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded-circle flex-shrink-0"
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                  <span className="fz14 lh-sm">
                    <span className="dark-color fw500">{n.actor.displayName}</span>{" "}
                    <span className="text">{n.text}</span>
                    <span className="d-block fz13 text-thm mt-1">{timeAgo(n.createdAt, data.now)}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
