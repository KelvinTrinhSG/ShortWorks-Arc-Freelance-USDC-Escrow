import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import DeliveryCard from "@/components/project/DeliveryCard";
import JobActions from "@/components/project/JobActions";
import { JobStatusBadge, jobStage } from "@/components/project/JobCard";
import { dueLabel, formatDate } from "@/components/project/ProjectCard";
import VideoFrame from "@/components/project/VideoFrame";
import { DISPUTE_REASONS, VIDEO_LENGTHS, WORK_TYPES, estimateEarnings } from "@/data/projectOptions";
import { COUNTRIES, PLATFORMS, labelOf } from "@/data/talentOptions";
import { getJob } from "@/lib/jobs";
import { getViewer } from "@/lib/viewer";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

async function load(params) {
  const { id } = await params;
  const data = await getJob(id, await getViewer());
  // Read the clock here, once per request, rather than during render.
  return data && { ...data, today: new Date().toISOString().slice(0, 10) };
}

export async function generateMetadata({ params }) {
  const data = await load(params);
  return { title: data ? `Job: ${data.project.title} | ShortWorks` : "ShortWorks - Job not found" };
}

const formatDay = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function Section({ icon, title, children }) {
  return (
    <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
      <h4 className="mb20 d-flex align-items-center gap-2">
        <span className={`${icon} text-thm`} /> {title}
      </h4>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="d-flex justify-content-between py-2 bdrb1 gap-3">
      <span className="text">{label}</span>
      <span className="fw500 dark-color text-end">{children}</span>
    </div>
  );
}

const money2 = (n) => `$${Number(n).toFixed(2)}`;
const SYSTEM_EVENTS = new Set(["auto_approved", "dispute_resolved"]);

// The job's PayPal payment (lib/payments.js): held, paid with the fee breakdown, or released.
function PaymentCard({ payment, job, isClient, videoCount }) {
  const estimate = estimateEarnings(job.total);
  const s = payment?.status;
  const status =
    s === "captured" ? <span className="text-success">Paid ✓</span>
    : s === "capturing" ? "Paying…"
    : s === "voided" ? "Released, nobody was charged"
    : s === "expired" ? <span className="text-danger">Hold expired</span>
    : s === "failed" ? <span className="text-danger">Payment failed</span>
    : s === "authorized" && job.status === "disputed" ? <span className="text-danger">Held · on hold (dispute)</span>
    : s === "authorized" ? "Held by PayPal"
    : "No payment on record";

  return (
    <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
      <h5 className="mb15 d-flex align-items-center gap-2">
        <span className="fab fa-paypal" style={{ color: "#003087" }} /> Payment
      </h5>
      <p className="text mb-0 fz14">{isClient ? "You pay" : "Client pays"}</p>
      <h3 className="mb5">{money2(payment?.amount ?? job.total)}</h3>
      <p className="text fz14 mb15">
        ${job.pricePerVideo} per video × {videoCount}
      </p>
      <Row label="Status">{status}</Row>
      {s === "authorized" && payment.expiresAt && (
        <Row label="Held until">{formatDateTime(payment.expiresAt)}</Row>
      )}
      {s === "captured" ? (
        <>
          <Row label="PayPal fee">−{money2(payment.paypalFee ?? 0)}</Row>
          <Row label={`Platform fee`}>−{money2(payment.platformFee)}</Row>
          <Row label={isClient ? "Freelancer received" : "You received"}>
            <span className="text-success">{money2(payment.netToFreelancer ?? 0)}</span>
          </Row>
        </>
      ) : (
        s !== "voided" && (
          <>
            <Row label="Platform fee">−{money2(payment?.platformFee ?? estimate.platformFee)}</Row>
            <Row label={isClient ? "Freelancer receives" : "You receive"}>≈ {money2(estimate.net)}</Row>
          </>
        )
      )}
      <p className="text fz13 mt15 mb-0">
        {s === "authorized"
          ? isClient
            ? "PayPal holds the money on your account. You're only charged when you approve the work."
            : "The client's money is held by PayPal and goes straight to your PayPal account when the work is approved."
          : s === "captured"
            ? "Paid through PayPal, straight to the freelancer's account."
            : s === "voided"
              ? "The hold was released and the client was not charged."
              : "PayPal fee is an estimate until the payment is taken."}
      </p>
    </div>
  );
}

const EVENT_TEXT = {
  submitted: "submitted the videos",
  revision_requested: "asked for changes",
  approved: "approved the work",
  dispute_opened: "opened a dispute",
  dispute_withdrawn: "withdrew the dispute",
  auto_approved: "approved the work automatically (no answer for 3 days)",
  dispute_resolved: "decided the dispute",
};

// Hired -> In progress -> Submitted -> Completed. A dispute is shown on the step it froze.
function Progress({ status, statusBeforeDispute }) {
  const order = ["in_progress", "submitted", "completed"];
  const at = order.indexOf(status === "disputed" ? statusBeforeDispute : status);
  const steps = [
    { label: "Hired", done: true },
    { label: "In progress", done: at > 0, current: at === 0 },
    { label: "Submitted", done: at > 1, current: at === 1 },
    status === "cancelled"
      ? { label: "Cancelled · payment released", done: false, current: true }
      : { label: "Completed", done: at === 2, current: false },
  ];
  return (
    <ol className="list-unstyled mb-0">
      {steps.map((s, i) => (
        <li key={s.label} className="d-flex gap-3 position-relative pb20">
          {i < steps.length - 1 && (
            <span
              className="position-absolute"
              style={{ left: 11, top: 26, bottom: 0, width: 2, background: s.done ? "#5bbb7b" : "#e9e9e9" }}
            />
          )}
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0 fz12 fw600"
            style={{
              width: 24,
              height: 24,
              background: s.done ? "#5bbb7b" : s.current ? (status === "disputed" || status === "cancelled" ? "#b91c1c" : "#222") : "#e9e9e9",
              color: s.done || s.current ? "#fff" : "#6b7177",
            }}
          >
            {s.done ? "✓" : i + 1}
          </span>
          <p className={`mb-0 fw500 ${s.done || s.current ? "dark-color" : "text"}`}>
            {s.label}
            {s.current && status === "disputed" && <span className="text-danger fz13"> · on hold (dispute)</span>}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default async function JobPage({ params }) {
  const data = await load(params);
  // Not the hiring client or the hired freelancer, or not (or no longer) accepted.
  if (!data) notFound();
  const { role, project: p, job, freelancer: f, events, payment, today } = data;
  const isClient = role === "client";
  const due = dueLabel(job.deliveryDate, today);
  const stage = jobStage(job.status, job.deliveryDate, today);
  const deliveries = events.filter((e) => e.type === "submitted");
  const revisions = events.filter((e) => e.type === "revision_requested").length;
  // Shown at the top while it is under review or once it was approved.
  const latest = job.status === "in_progress" ? null : deliveries.at(-1) ?? null;
  const byLabel = (e) => (e.byMe ? "you" : e.actorName);
  const lastDispute = events.findLast((e) => e.type === "dispute_opened");
  const budgetTotal = Math.round(p.budgetPerVideo * p.videoCount * 100) / 100;
  const diff = Math.round((job.total - budgetTotal) * 100) / 100;
  // The other side of the job.
  const other = isClient
    ? { title: "Freelancer", name: f.displayName, avatarUrl: f.avatarUrl, href: `/talents/${encodeURIComponent(f.username)}`, sub: [f.headline, f.country].filter(Boolean).join(" · ") }
    : {
        title: "Client",
        name: p.client.displayName,
        avatarUrl: p.client.avatarUrl,
        sub: [
          p.client.country && labelOf(COUNTRIES, p.client.country),
          `Member since ${new Date(p.client.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
        ]
          .filter(Boolean)
          .join(" · "),
      };

  return (
    <>
      <Header20 />
      <section className="pt30 pb90">
        <div className="container">
          <Link href="/job-1" className="fz14 text-thm">
            ← All jobs
          </Link>

          {/* Title */}
          <div className="mt15 mb30">
            <div className="d-flex flex-wrap align-items-center gap-3 mb10">
              <h2 className="mb-0">{p.title}</h2>
              <JobStatusBadge status={job.status} deliveryDate={job.deliveryDate} today={today} />
            </div>
            <p className="text mb-0">
              {isClient ? `You hired ${f.displayName}` : `Hired by ${p.client.displayName}`}
              {job.acceptedAt && ` on ${formatDay(job.acceptedAt)}`}
              {(stage === "in_progress" || stage === "overdue") && (
                <>
                  {" "}· <span className={`fw500 ${due.className}`}>{due.text}</span>
                </>
              )}
            </p>
          </div>

          <div className="row">
            <div className="col-lg-8">
              {/* The latest hand-in sits above the next step, so it is what gets reviewed.
                  Back in progress after a change request, it moves down to Quality. */}
              {latest && (
                <DeliveryCard
                  delivery={latest}
                  number={deliveries.length}
                  latest
                  approved={job.status === "completed"}
                  byLabel={byLabel(latest)}
                />
              )}
              <JobActions
                jobId={job.id}
                role={role}
                status={job.status}
                videoCount={p.videoCount}
                total={job.total}
                freelancerName={f.displayName}
                autoApproveAt={job.autoApproveAt && formatDateTime(job.autoApproveAt)}
                disputeOpenedByMe={job.disputeOpenedByMe}
              />
              {job.status === "disputed" && lastDispute && (
                <div className="bdr1 bdrs8 p20 mb30" style={{ borderColor: "#f3c4c4", backgroundColor: "#fdf5f5" }}>
                  <p className="fw500 dark-color mb5">
                    {lastDispute.byMe ? "You" : lastDispute.actorName} opened a dispute ·{" "}
                    {labelOf(DISPUTE_REASONS, lastDispute.reason)}
                  </p>
                  <p className="text fz14 mb10" style={{ whiteSpace: "pre-line" }}>
                    {lastDispute.note}
                  </p>
                  {job.disputeDecideBy && (
                    <p className="fz14 dark-color fw500 mb-0">
                      ShortWorks will decide by {formatDateTime(job.disputeDecideBy)}: either the freelancer
                      is paid in full, or the payment is released to the client.{" "}
                      <Link href="/terms#disputes" className="text-thm fw400">
                        How disputes work
                      </Link>
                    </p>
                  )}
                </div>
              )}

              {/* Scope: what has to be delivered */}
              <Section icon="flaticon-goal" title="Scope">
                <div className="row">
                  <div className="col-sm-6">
                    <Row label="Videos">
                      {p.videoCount} × {labelOf(VIDEO_LENGTHS, p.videoLength)}
                    </Row>
                    <Row label="Type of work">{labelOf(WORK_TYPES, p.workType)}</Row>
                  </div>
                  <div className="col-sm-6">
                    <Row label="Platforms">{p.platforms.map((x) => labelOf(PLATFORMS, x)).join(", ")}</Row>
                    <Row label="Format">9:16 vertical</Row>
                  </div>
                </div>
                <h6 className="mt25 mb10">Brief</h6>
                <p className="text mb-0" style={{ whiteSpace: "pre-line" }}>
                  {p.brief}
                </p>
                {p.references.length > 0 && (
                  <>
                    <h6 className="mt30 mb15">Reference videos</h6>
                    <div className="row">
                      {p.references.map((r, i) => (
                        <div key={r.url} className="col-6 col-md-4 mb20">
                          <VideoFrame url={r.url} embedUrl={r.embedUrl} title={`Reference video ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <Link href={`/project-single/${p.id}`} className="fz14 text-thm d-inline-block mt10">
                  View the original project ↗
                </Link>
              </Section>

              {/* Time: the dates that matter */}
              <Section icon="flaticon-30-days" title="Time">
                <Row label="Proposal sent">{formatDay(job.proposedAt)}</Row>
                <Row label="Hired">{job.acceptedAt ? formatDay(job.acceptedAt) : "—"}</Row>
                <Row label="Delivery date (agreed)">
                  {formatDate(job.deliveryDate)}
                  {(stage === "in_progress" || stage === "overdue") && (
                    <span className={`fz14 ms-2 ${due.className}`}>({due.text})</span>
                  )}
                </Row>
                <Row label="Project deadline">{formatDate(p.deadline)}</Row>
                <Row label="Submitted">
                  {deliveries.length ? formatDay(deliveries.at(-1).createdAt) : "Not yet"}
                </Row>
                <Row label="Completed">{job.completedAt ? formatDay(job.completedAt) : "Not yet"}</Row>
              </Section>

              {/* Cost: what was agreed and what it adds up to */}
              <Section icon="flaticon-dollar" title="Cost">
                <Row label="Agreed price">${job.pricePerVideo} / video</Row>
                <Row label="Videos">× {p.videoCount}</Row>
                <Row label="Total">
                  <span className="fz17">${job.total}</span>
                </Row>
                <Row label="Client's budget">
                  ${p.budgetPerVideo} / video (total ${budgetTotal})
                  {diff !== 0 && (
                    <span className={`fz14 ms-2 ${diff > 0 ? "text-warning" : "text-thm"}`}>
                      {diff > 0 ? `+$${diff}` : `-$${-diff}`} vs budget
                    </span>
                  )}
                </Row>
              </Section>

              {/* Quality: what was delivered and how the review went */}
              <Section icon="flaticon-review" title="Quality">
                <div className="row mb20">
                  <div className="col-sm-6">
                    <Row label="Deliveries">{deliveries.length}</Row>
                  </div>
                  <div className="col-sm-6">
                    <Row label="Change requests">{revisions}</Row>
                  </div>
                </div>
                {deliveries.length === 0 ? (
                  <p className="text mb20">
                    {isClient
                      ? "Nothing delivered yet. The videos show up here when the freelancer submits them."
                      : "Nothing delivered yet. Submit your videos above when they're ready."}
                  </p>
                ) : (
                  <>
                    {latest && <p className="text fz14 mb20">The latest delivery is shown at the top of the page.</p>}
                    {/* Every other delivery, newest first. */}
                    {deliveries
                      .map((d, i) => ({ d, number: i + 1 }))
                      .filter(({ d }) => d !== latest)
                      .reverse()
                      .map(({ d, number }) => (
                        <DeliveryCard
                          key={d.id}
                          delivery={d}
                          number={number}
                          latest={number === deliveries.length}
                          byLabel={byLabel(d)}
                        />
                      ))}
                  </>
                )}
                <h6 className="mt20 mb10">{isClient ? "The freelancer's proposal" : "Your proposal"}</h6>
                <p className="text fz14 mb-0" style={{ whiteSpace: "pre-line" }}>
                  {job.coverLetter}
                </p>
                {job.sampleUrl && (
                  <div className="mt15" style={{ maxWidth: 200 }}>
                    <VideoFrame url={job.sampleUrl} embedUrl={job.sampleEmbedUrl} title="Sample video" />
                  </div>
                )}
              </Section>

              {/* Everything that happened, oldest first */}
              <Section icon="flaticon-notification-1" title="Activity">
                <ul className="list-unstyled mb-0">
                  <li className="py-2 bdrb1 fz14">
                    <span className="text">{formatDay(job.proposedAt)}</span> ·{" "}
                    {isClient ? f.displayName : "You"} sent the proposal
                  </li>
                  {job.acceptedAt && (
                    <li className="py-2 bdrb1 fz14">
                      <span className="text">{formatDay(job.acceptedAt)}</span> ·{" "}
                      {isClient ? "You" : p.client.displayName} hired {isClient ? f.displayName : "you"}
                    </li>
                  )}
                  {events.map((e) => (
                    <li key={e.id} className="py-2 bdrb1 fz14">
                      <span className="text">{formatDateTime(e.createdAt)}</span> ·{" "}
                      {/* ShortWorks' own steps show as ShortWorks, not as the admin's account. */}
                      {SYSTEM_EVENTS.has(e.type) ? "ShortWorks" : e.byMe ? "You" : e.actorName} {EVENT_TEXT[e.type] ?? e.type}
                      {e.type === "dispute_resolved"
                        ? e.reason === "pay"
                          ? ": the freelancer is paid in full"
                          : ": the payment is released to the client"
                        : e.reason && ` (${labelOf(DISPUTE_REASONS, e.reason)})`}
                      {e.note && e.type !== "submitted" && (
                        <p className="text mb-0 mt5" style={{ whiteSpace: "pre-line" }}>
                          “{e.note}”
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            </div>

            <div className="col-lg-4">
              <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
                <h5 className="mb20">Status</h5>
                <Progress status={job.status} statusBeforeDispute={job.statusBeforeDispute} />
              </div>

              <PaymentCard payment={payment} job={job} isClient={isClient} videoCount={p.videoCount} />


              <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
                <h5 className="mb15">{other.title}</h5>
                <div className="d-flex align-items-center gap-3">
                  <Image
                    src={other.avatarUrl || "/images/resource/default-avatar.svg"}
                    alt={other.name}
                    width={56}
                    height={56}
                    className="rounded-circle"
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                  <div style={{ minWidth: 0 }}>
                    {other.href ? (
                      <Link href={other.href} className="fw500 dark-color">
                        {other.name}
                      </Link>
                    ) : (
                      <p className="fw500 dark-color mb-0">{other.name}</p>
                    )}
                    {other.sub && <p className="fz14 text mb-0">{other.sub}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
