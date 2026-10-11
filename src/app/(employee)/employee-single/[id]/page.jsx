import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import ProjectCard from "@/components/project/ProjectCard";
import { getEmployer } from "@/lib/employers";
import { getViewer } from "@/lib/viewer";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

// `id` is the employer's username (links from /employee-1 and project pages).
async function load(params) {
  const { id } = await params;
  const data = await getEmployer(decodeURIComponent(id));
  // Read the clock here, once per request, rather than during render.
  return data && { ...data, viewer: await getViewer(), now: Date.now() };
}

export async function generateMetadata({ params }) {
  const data = await load(params);
  return {
    title: data ? `${data.employer.displayName} | Employers | ShortWorks` : "ShortWorks - Employer not found",
    description: data?.employer.headline || undefined,
  };
}

const since = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });

function Stat({ value, label }) {
  return (
    <div className="col-6 col-md-3">
      <div className="bgc-white bdrs12 p20 mb30 default-box-shadow1 text-center h-100">
        <h3 className="mb5">{value}</h3>
        <p className="text fz14 mb-0">{label}</p>
      </div>
    </div>
  );
}

// An employer's public page: who they are, how they hire, and their open projects.
export default async function EmployerPage({ params }) {
  const data = await load(params);
  // Unknown username, or a freelancer account.
  if (!data) notFound();
  const { employer: e, projects, viewer, now } = data;
  const isMe = viewer?.username?.toLowerCase() === e.username.toLowerCase();

  return (
    <>
      <Header20 />
      <section className="pt30 pb90">
        <div className="container">
          <Link href="/employee-1" className="fz14 text-thm">
            ← All employers
          </Link>

          {/* Header */}
          <div className="d-flex flex-wrap align-items-center gap-4 mt20 mb40">
            <Image
              src={e.avatarUrl || "/images/resource/default-avatar.svg"}
              alt={e.displayName}
              width={100}
              height={100}
              className="rounded-circle flex-shrink-0"
              style={{ objectFit: "cover" }}
              unoptimized
            />
            <div className="flex-grow-1" style={{ minWidth: 220 }}>
              <h2 className="mb5">
                {e.displayName}
                {e.openProjects > 0 && (
                  <span className="badge rounded-pill fw500 ms-3 align-middle" style={{ color: "#15803d", background: "#e3f6ea", fontSize: 13 }}>
                    Hiring now
                  </span>
                )}
              </h2>
              {e.headline && <p className="dark-color mb5">{e.headline}</p>}
              <p className="text fz14 mb-0">
                {[e.country, e.languages.length > 0 && e.languages.join(", "), `Member since ${since(e.memberSince)}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {isMe && (
              <Link href="/my-profile" className="ud-btn btn-light-thm">
                Edit my profile
              </Link>
            )}
          </div>

          {/* How they hire */}
          <div className="row">
            <Stat value={e.openProjects} label={e.openProjects === 1 ? "Open project" : "Open projects"} />
            <Stat value={e.projectsPosted} label={e.projectsPosted === 1 ? "Project posted" : "Projects posted"} />
            <Stat value={e.hires} label={e.hires === 1 ? "Freelancer hired" : "Freelancers hired"} />
            <Stat value={e.jobsCompleted} label={e.jobsCompleted === 1 ? "Job completed" : "Jobs completed"} />
          </div>

          {e.bio && (
            <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
              <h4 className="mb15">About</h4>
              <p className="text mb-0" style={{ whiteSpace: "pre-line" }}>
                {e.bio}
              </p>
            </div>
          )}

          {/* Open projects */}
          <h4 className="mb20 mt10">
            Open projects ({projects.length})
          </h4>
          {projects.length === 0 ? (
            <div className="bdr1 bdrs8 p30 text-center">
              <p className="text mb15">{e.displayName} has no open projects right now.</p>
              <Link href="/project-1" className="ud-btn btn-light-thm">
                Browse all projects <i className="fal fa-arrow-right-long" />
              </Link>
            </div>
          ) : (
            <div className="row">
              {projects.map((p) => (
                <div key={p.id} className="col-lg-6 mb30">
                  <ProjectCard project={p} now={now} ctaLabel={viewer?.accountType === "client" ? "View Details" : undefined} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
