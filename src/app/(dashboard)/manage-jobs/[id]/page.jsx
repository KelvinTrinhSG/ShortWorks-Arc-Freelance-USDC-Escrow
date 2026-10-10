import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardNavigation from "@/components/dashboard/header/DashboardNavigation";
import MobileNavigation2 from "@/components/header/MobileNavigation2";
import { dueLabel, formatDate } from "@/components/project/ProjectCard";
import VideoFrame from "@/components/project/VideoFrame";
import { VIDEO_LENGTHS, WORK_TYPES } from "@/data/projectOptions";
import { COUNTRIES, PLATFORMS, labelOf } from "@/data/talentOptions";
import { getJob } from "@/lib/jobs";
import { getViewer } from "@/lib/viewer";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = {
  title: "ShortWorks - Job",
};

async function load(params) {
  const { id } = await params;
  const job = await getJob(id, await getViewer());
  // Read the clock here, once per request, rather than during render.
  return job && { ...job, today: new Date().toISOString().slice(0, 10) };
}

const formatDateTime = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Job progress. Steps after "In progress" are the planned flow (docs/jobs.md).
function Timeline({ steps }) {
  return (
    <ol className="list-unstyled mb-0">
      {steps.map((s, i) => (
        <li key={s.label} className="d-flex gap-3 position-relative pb20">
          {i < steps.length - 1 && (
            <span
              className="position-absolute"
              style={{
                left: 11,
                top: 26,
                bottom: 0,
                width: 2,
                background: s.state === "done" ? "#5bbb7b" : "#e9e9e9",
              }}
            />
          )}
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0 fz12 fw600"
            style={{
              width: 24,
              height: 24,
              background: s.state === "done" ? "#5bbb7b" : s.state === "current" ? "#222" : "#e9e9e9",
              color: s.state === "upcoming" ? "#6b7177" : "#fff",
            }}
          >
            {s.state === "done" ? "✓" : i + 1}
          </span>
          <div>
            <p className={`mb-0 fw500 ${s.state === "upcoming" ? "text" : "dark-color"}`}>{s.label}</p>
            {s.detail && <p className="fz13 text mb-0">{s.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Fact({ label, children }) {
  return (
    <div className="d-flex justify-content-between py-2 bdrb1 gap-3">
      <span className="text">{label}</span>
      <span className="fw500 dark-color text-end">{children}</span>
    </div>
  );
}

export default async function JobPage({ params }) {
  const job = await load(params);
  // Not yours, not accepted (or the client undid it), or not a freelancer.
  if (!job) notFound();
  const { project: p, proposal: pr, today } = job;
  const due = dueLabel(pr.deliveryDate, today);
  const total = Math.round(pr.pricePerVideo * p.videoCount * 100) / 100;

  const steps = [
    { label: "Proposal sent", detail: formatDateTime(pr.createdAt), state: "done" },
    { label: "Proposal accepted", detail: pr.acceptedAt ? formatDateTime(pr.acceptedAt) : null, state: "done" },
    {
      label: "In progress",
      detail: `Make ${p.videoCount} ${p.videoCount === 1 ? "video" : "videos"} · deliver by ${formatDate(pr.deliveryDate)}`,
      state: "current",
    },
    { label: "Delivered", detail: "Submit your videos for the client to review", state: "upcoming" },
    { label: "Completed", detail: "The client approves and payment is released", state: "upcoming" },
  ];

  return (
    <>
      <MobileNavigation2 />
      <DashboardLayout>
        <div className="dashboard__content hover-bgc-color">
          <div className="row pb30">
            <div className="col-lg-12">
              <DashboardNavigation />
            </div>
            <div className="col-lg-12">
              <Link href="/manage-jobs" className="fz14 text-thm">
                ← Manage Jobs
              </Link>
              <div className="dashboard_title_area mt10">
                <h2>{p.title}</h2>
                <p className="text mb-0">
                  For {p.client.displayName} ·{" "}
                  <span className="badge bg-dark">In progress</span>{" "}
                  <span className={`fw500 ${due.className}`}>{due.text}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-xl-8">
              <div className="ps-widget bgc-white bdrs4 p30 mb30">
                <h5 className="list-title mb20">What to deliver</h5>
                <div className="row mb10">
                  <div className="col-sm-6">
                    <Fact label="Videos">
                      {p.videoCount} × {labelOf(VIDEO_LENGTHS, p.videoLength)}
                    </Fact>
                    <Fact label="Type of work">{labelOf(WORK_TYPES, p.workType)}</Fact>
                  </div>
                  <div className="col-sm-6">
                    <Fact label="Platforms">
                      {p.platforms.map((x) => labelOf(PLATFORMS, x)).join(", ")}
                    </Fact>
                    <Fact label="Format">9:16 vertical</Fact>
                  </div>
                </div>
                <h6 className="mt20 mb10">Brief</h6>
                <p className="text mb-0" style={{ whiteSpace: "pre-line" }}>
                  {p.brief}
                </p>
                {p.references.length > 0 && (
                  <>
                    <h6 className="mt30 mb15">Reference videos from the client</h6>
                    <div className="row">
                      {p.references.map((r, i) => (
                        <div key={r.url} className="col-6 col-md-4 mb20">
                          <VideoFrame url={r.url} embedUrl={r.embedUrl} title={`Reference video ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="ps-widget bgc-white bdrs4 p30 mb30">
                <h5 className="list-title mb15">Your proposal</h5>
                <p className="text mb-0" style={{ whiteSpace: "pre-line" }}>
                  {pr.coverLetter}
                </p>
                {pr.sampleUrl && (
                  <div className="mt15" style={{ maxWidth: 200 }}>
                    <VideoFrame url={pr.sampleUrl} embedUrl={pr.sampleEmbedUrl} title="Your sample video" />
                  </div>
                )}
                <Link href={`/project-single/${p.id}`} className="fz14 text-thm d-inline-block mt15">
                  View the project page ↗
                </Link>
              </div>
            </div>

            <div className="col-xl-4">
              <div className="ps-widget bgc-white bdrs4 p30 mb30">
                <h5 className="list-title mb20">Progress</h5>
                <Timeline steps={steps} />
              </div>

              <div className="ps-widget bgc-white bdrs4 p30 mb30">
                <h5 className="list-title mb15">Agreed terms</h5>
                <p className="text mb-0 fz14">You earn</p>
                <h3 className="mb5">${total}</h3>
                <p className="text fz14 mb15">
                  ${pr.pricePerVideo} per video × {p.videoCount}
                </p>
                <Fact label="Your delivery date">{formatDate(pr.deliveryDate)}</Fact>
                <Fact label="Project deadline">{formatDate(p.deadline)}</Fact>
                <Fact label="Client budget">${p.budgetPerVideo} / video</Fact>
              </div>

              <div className="ps-widget bgc-white bdrs4 p30 mb30">
                <h5 className="list-title mb15">Client</h5>
                <div className="d-flex align-items-center gap-3">
                  <Image
                    src={p.client.avatarUrl || "/images/resource/default-avatar.svg"}
                    alt={p.client.displayName}
                    width={56}
                    height={56}
                    className="rounded-circle"
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                  <div>
                    <p className="fw500 dark-color mb-0">{p.client.displayName}</p>
                    <p className="fz14 text mb-0">
                      {[
                        p.client.country && labelOf(COUNTRIES, p.client.country),
                        `Member since ${new Date(p.client.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
