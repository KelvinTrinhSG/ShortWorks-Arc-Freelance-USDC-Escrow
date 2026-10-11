import {
  COUNTRIES,
  NICHES,
  PLATFORMS,
  ROLES,
  TURNAROUND,
  labelOf,
} from "@/data/talentOptions";
import Image from "next/image";
import Link from "next/link";

const AVAILABILITY_DOT = {
  available: { color: "#22c55e", label: "Available for work" },
  busy: { color: "#eab308", label: "Busy" },
  away: { color: "#9ca3af", label: "Away" },
};

// Every account is listed, so any field may still be empty: show only what exists.
// `action`: optional extra control under View Profile (the Invite button in invite mode).
// `inviteId`: in invite mode, passed on so the profile page puts that project first.
export default function TalentCard({ talent, action, inviteId }) {
  const dot = AVAILABILITY_DOT[talent.availability] ?? AVAILABILITY_DOT.away;
  const href = `/talents/${encodeURIComponent(talent.username)}${inviteId ? `?invite=${inviteId}` : ""}`;

  const meta = [
    talent.country && { label: "Location", value: labelOf(COUNTRIES, talent.country) },
    talent.startingPrice !== null && { label: "From", value: `$${talent.startingPrice} / video` },
    talent.turnaroundHours && { label: "Delivery", value: labelOf(TURNAROUND, talent.turnaroundHours) },
  ].filter(Boolean);

  return (
    <div className="freelancer-style1 text-center bdr1 hover-box-shadow h-100 d-flex flex-column">
      <div className="thumb w90 mb20 mx-auto position-relative rounded-circle">
        <Image
          className="rounded-circle mx-auto"
          src={talent.avatarUrl || "/images/resource/default-avatar.svg"}
          alt={talent.displayName}
          width={90}
          height={90}
          style={{ objectFit: "cover" }}
          unoptimized
        />
        <span
          className="online"
          title={dot.label}
          style={{ backgroundColor: dot.color }}
        />
      </div>
      <div className="details d-flex flex-column flex-grow-1">
        <h5 className="title mb-1">{talent.displayName}</h5>
        {talent.completedJobs > 0 && (
          <p className="fz13 dark-color fw500 mb5">
            ✓ {talent.completedJobs} {talent.completedJobs === 1 ? "job" : "jobs"} completed
          </p>
        )}
        {talent.roles.length > 0 && (
          <p className="mb-0 text-thm fz14">
            {talent.roles.map((r) => labelOf(ROLES, r)).join(" · ")}
          </p>
        )}
        {talent.headline && (
          <p
            className="mb-0 mt10 fz14"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={talent.headline}
          >
            {talent.headline}
          </p>
        )}
        {talent.niches.length > 0 && (
          <div className="skill-tags d-flex flex-wrap align-items-center justify-content-center gap-2 mt15">
            {talent.niches.slice(0, 3).map((n) => (
              <span key={n} className="tag">
                {labelOf(NICHES, n)}
              </span>
            ))}
            {talent.niches.length > 3 && (
              <span className="tag">+{talent.niches.length - 3}</span>
            )}
          </div>
        )}
        {talent.platforms.length > 0 && (
          <p className="fz13 text-muted mt10 mb-0">
            {talent.platforms.map((p) => labelOf(PLATFORMS, p)).join(" · ")}
          </p>
        )}
        {/* Pushes the meta row and button to the bottom so cards line up. */}
        <div className="mt-auto">
          {meta.length > 0 && (
            <>
              <hr className="opacity-100 mt15 mb15" />
              <div className="fl-meta d-flex align-items-start justify-content-between gap-2">
                {meta.map((m) => (
                  <span key={m.label} className="meta fw500 text-start">
                    {m.label}
                    <br />
                    <span className="fz14 fw400">{m.value}</span>
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="d-grid mt15">
            <Link href={href} className="ud-btn btn-light-thm">
              View Profile
              <i className="fal fa-arrow-right-long" />
            </Link>
          </div>
          {action && <div className="mt10">{action}</div>}
        </div>
      </div>
    </div>
  );
}
