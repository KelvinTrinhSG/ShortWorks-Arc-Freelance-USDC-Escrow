import Image from "next/image";
import Link from "next/link";

const since = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });

// One employer on /employee-1: who they are and whether they're hiring now.
export default function EmployerCard({ employer: e }) {
  const href = `/employee-single/${encodeURIComponent(e.username)}`;
  const stats = [
    { label: "Open projects", value: e.openProjects },
    { label: "Hires", value: e.hires },
    { label: "Member since", value: since(e.memberSince) },
  ];

  return (
    <div className="freelancer-style1 text-center bdr1 hover-box-shadow h-100 d-flex flex-column">
      <div className="thumb w90 mb20 mx-auto position-relative rounded-circle">
        <Image
          className="rounded-circle mx-auto"
          src={e.avatarUrl || "/images/resource/default-avatar.svg"}
          alt={e.displayName}
          width={90}
          height={90}
          style={{ objectFit: "cover" }}
          unoptimized
        />
        {e.openProjects > 0 && <span className="online" title="Hiring now" style={{ backgroundColor: "#22c55e" }} />}
      </div>
      <div className="details d-flex flex-column flex-grow-1">
        <h5 className="title mb-1">
          <Link href={href} className="dark-color">
            {e.displayName}
          </Link>
        </h5>
        <p className="mb-0 fz14 text-thm">
          {e.openProjects > 0 ? `Hiring now · ${e.openProjects} open ${e.openProjects === 1 ? "project" : "projects"}` : "Not hiring right now"}
        </p>
        {(e.headline || e.country) && (
          <p
            className="mb-0 mt10 fz14"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {[e.headline, e.country].filter(Boolean).join(" · ")}
          </p>
        )}
        {/* Pushes the stats and button to the bottom so cards line up. */}
        <div className="mt-auto">
          <hr className="opacity-100 mt15 mb15" />
          <div className="fl-meta d-flex align-items-start justify-content-between gap-2">
            {stats.map((s) => (
              <span key={s.label} className="meta fw500 text-start">
                {s.label}
                <br />
                <span className="fz14 fw400">{s.value}</span>
              </span>
            ))}
          </div>
          <div className="d-grid mt15">
            <Link href={href} className="ud-btn btn-light-thm">
              {e.openProjects > 0 ? "See open projects" : "View Employer"}
              <i className="fal fa-arrow-right-long" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
