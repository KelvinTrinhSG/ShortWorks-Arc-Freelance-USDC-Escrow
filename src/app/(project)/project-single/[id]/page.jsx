import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import CancelInviteButton from "@/components/project/CancelInviteButton";
import DeclineInviteButton from "@/components/project/DeclineInviteButton";
import MyProposal from "@/components/project/MyProposal";
import { formatDate, timeAgo } from "@/components/project/ProjectCard";
import ProjectOwnerActions from "@/components/project/ProjectOwnerActions";
import ProposalCard from "@/components/project/ProposalCard";
import ProposalDecision from "@/components/project/ProposalDecision";
import ProposalForm from "@/components/project/ProposalForm";
import VideoFrame from "@/components/project/VideoFrame";
import { VIDEO_LENGTHS, WORK_TYPES } from "@/data/projectOptions";
import { COUNTRIES, PLATFORMS, labelOf } from "@/data/talentOptions";
import { getInvitationStatus, getProjectInvitations } from "@/lib/invitations";
import { getPaypalAccount } from "@/lib/payments";
import { getProject } from "@/lib/projects";
import { getViewer } from "@/lib/viewer";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

async function load(params) {
  const { id } = await params;
  const viewer = await getViewer();
  const data = await getProject(id, viewer);
  if (!data) return null;
  // The owner sees who they invited; a freelancer sees whether they were invited.
  const invitations = data.isOwner ? await getProjectInvitations(data.project.id) : [];
  const isFreelancer = viewer?.accountType === "freelancer";
  const invitation = isFreelancer ? await getInvitationStatus(data.project.id, viewer.id) : null;
  // A freelancer without PayPal connected can apply, but can't be hired yet.
  const paypalReady = isFreelancer ? (await getPaypalAccount(viewer.id))?.status === "ready" : true;
  // Read the clock here, once per request, rather than during render.
  return { ...data, viewer, invitations, invitation, paypalReady, now: Date.now() };
}

// Talent directory in invite mode, with no filters: every freelancer is shown.
const inviteHref = (p) => `/freelancer-1?invite=${p.id}`;

export async function generateMetadata({ params }) {
  const data = await load(params);
  return {
    title: data ? `${data.project.title} | ShortWorks` : "ShortWorks - Project not found",
    description: data?.project.brief.slice(0, 160),
  };
}

function Fact({ icon, title, children }) {
  return (
    <div className="col-sm-6 col-xl-4">
      <div className="iconbox-style1 contact-style d-flex align-items-start mb30">
        <div className="icon flex-shrink-0">
          <span className={icon} />
        </div>
        <div className="details">
          <h5 className="title">{title}</h5>
          <p className="mb-0 text">{children}</p>
        </div>
      </div>
    </div>
  );
}

export default async function ProjectPage({ params }) {
  const data = await load(params);
  if (!data) notFound();
  const { project: p, isOwner, proposals, myProposal, viewer, invitations, invitation, paypalReady, now } = data;
  const paypalNotice = !paypalReady && (myProposal?.status ?? "pending") === "pending" && (
    <div className="bdr1 bdrs8 p20 mb30" style={{ backgroundColor: "#fff8e6" }}>
      <p className="dark-color fw500 mb5">Connect PayPal so the client can hire you</p>
      <p className="text fz14 mb10">
        Clients pay through PayPal, straight into your account. Until it&apos;s connected, they can
        read your proposal but can&apos;t hire you.
      </p>
      <Link href="/paypal" className="fz14 text-thm">
        Connect PayPal →
      </Link>
    </div>
  );
  const total = Math.round(p.budgetPerVideo * p.videoCount * 100) / 100;
  const daysLeft = Math.ceil((new Date(`${p.deadline}T23:59:59Z`).getTime() - now) / 86400000);
  const backToProject = `/login?next=${encodeURIComponent(`/project-single/${p.id}`)}`;

  // What the bottom of the page offers depends on who is looking.
  let action;
  if (isOwner) {
    action = (
      <>
        {invitations.length > 0 && (
          <div className="mb40">
            <h4 className="mb20">Invited ({invitations.length})</h4>
            {invitations.map((inv) => (
              <div key={inv.username} className="d-flex align-items-center gap-3 py-2 bdrb1">
                <Image
                  src={inv.avatarUrl || "/images/resource/default-avatar.svg"}
                  alt={inv.displayName}
                  width={40}
                  height={40}
                  className="rounded-circle flex-shrink-0"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <Link
                    href={`/talents/${encodeURIComponent(inv.username)}`}
                    className="fw500 dark-color"
                  >
                    {inv.displayName}
                  </Link>
                  {inv.headline && <p className="fz14 text mb-0 text-truncate">{inv.headline}</p>}
                </div>
                {inv.proposed ? (
                  <span className="fz14 flex-shrink-0 text-thm fw500">Sent a proposal ✓</span>
                ) : inv.declinedAt ? (
                  <span className="fz14 flex-shrink-0 text-danger fw500">
                    Declined {timeAgo(inv.declinedAt, now)}
                  </span>
                ) : (
                  <span className="fz14 flex-shrink-0 text">Invited {timeAgo(inv.invitedAt, now)}</span>
                )}
                {/* Only while still waiting for an answer. */}
                {!inv.proposed && !inv.declinedAt && (
                  <CancelInviteButton
                    projectId={p.id}
                    username={inv.username}
                    displayName={inv.displayName}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        <h4 className="mb20">Proposals ({proposals.length})</h4>
        {proposals.length === 0 ? (
          <p className="text">
            No proposals yet. Freelancers will see your project on the projects page
            {p.isOpen && (
              <>
                , or you can <Link href={inviteHref(p)} className="text-thm">invite freelancers</Link>{" "}
                to send one
              </>
            )}
            .
          </p>
        ) : (
          proposals.map((pr) => (
            <ProposalCard
              key={pr.id}
              proposal={pr}
              videoCount={p.videoCount}
              now={now}
              actions={<ProposalDecision proposal={pr} />}
            />
          ))
        )}
      </>
    );
  } else if (myProposal) {
    action = (
      <>
        {paypalNotice}
        <MyProposal proposal={myProposal} project={p} username={viewer.username} now={now} />
      </>
    );
  } else if (p.hired) {
    action = <p className="text">The client has already hired a freelancer for this project.</p>;
  } else if (!p.isOpen) {
    action = <p className="text">This project is no longer accepting proposals.</p>;
  } else if (!viewer) {
    action = (
      <div className="bdr1 bdrs8 p30 text-center">
        <h4 className="mb10">Interested in this project?</h4>
        <p className="text mb20">Log in with a freelancer account to send your proposal.</p>
        <Link href={backToProject} className="ud-btn btn-thm me-2">
          Log in
        </Link>
        <Link href="/register?as=freelancer" className="ud-btn btn-light-thm">
          Join as a freelancer
        </Link>
      </div>
    );
  } else if (viewer.accountType !== "freelancer") {
    action = <p className="text">Only freelancer accounts can send proposals.</p>;
  } else {
    action = (
      <>
        {invitation === "invited" && (
          <div className="bdr1 bdrs8 p20 mb30" style={{ backgroundColor: "#f0faf3" }}>
            <p className="dark-color fw500 mb5">
              {p.client.displayName} invited you to this project
            </p>
            <p className="text fz14 mb-0">
              The client picked your profile and would like your proposal.
            </p>
          </div>
        )}
        {invitation === "declined" && (
          <p className="text fz14 mb20">
            You declined this invitation. You can still send a proposal if you change your mind.
          </p>
        )}
        {paypalNotice}
        <h4 className="mb20">Send your proposal</h4>
        <ProposalForm
          project={p}
          username={viewer.username}
          footer={
            invitation === "invited" && (
              <DeclineInviteButton projectId={p.id} clientName={p.client.displayName} />
            )
          }
        />
      </>
    );
  }

  return (
    <>
      <Header20 />
      <section className="pt30 pb90">
        <div className="container">
          <Link href="/project-1" className="fz14 text-thm">
            ← All projects
          </Link>

          {/* Title */}
          <div className="mt15 mb30">
            <h2 className="mb10">{p.title}</h2>
            <p className="text mb-0">
              Posted {timeAgo(p.createdAt, now)} by {p.client.displayName} ·{" "}
              {p.proposalCount} {p.proposalCount === 1 ? "proposal" : "proposals"}
              {p.hired ? (
                <span className="badge bg-success ms-2">Hired</span>
              ) : (
                !p.isOpen && <span className="badge bg-secondary ms-2">Closed</span>
              )}
            </p>
            {isOwner && (
              <div className="mt15">
                <ProjectOwnerActions project={p} afterDelete="/project-1" />
              </div>
            )}
          </div>

          <div className="row">
            <div className="col-lg-8">
              <div className="row">
                <Fact icon="flaticon-goal" title="Platforms">
                  {p.platforms.map((x) => labelOf(PLATFORMS, x)).join(", ")}
                </Fact>
                <Fact icon="flaticon-notification-1" title="Type of work">
                  {labelOf(WORK_TYPES, p.workType)}
                </Fact>
                <Fact icon="flaticon-fifteen" title="Videos × length">
                  {p.videoCount} × {labelOf(VIDEO_LENGTHS, p.videoLength)}
                </Fact>
                <Fact icon="flaticon-dollar" title="Budget">
                  ${p.budgetPerVideo} / video (total ${total})
                </Fact>
                <Fact icon="flaticon-30-days" title="Deadline">
                  {formatDate(p.deadline)}
                </Fact>
                <Fact icon="flaticon-contract" title="Proposals">
                  {p.proposalCount}
                </Fact>
              </div>

              <div className="service-about">
                <h4>Brief</h4>
                <p className="text mb30" style={{ whiteSpace: "pre-line" }}>
                  {p.brief}
                </p>

                {p.references.length > 0 && (
                  <>
                    <hr className="opacity-100 mb40 mt20" />
                    <h4 className="mb20">Reference videos</h4>
                    <div className="row">
                      {p.references.map((r, i) => (
                        <div key={r.url} className="col-6 col-md-4 mb20">
                          <VideoFrame url={r.url} embedUrl={r.embedUrl} title={`Reference video ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <hr className="opacity-100 mb40 mt20" />
                {action}
              </div>
            </div>

            <div className="col-lg-4">
              <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
                <p className="text mb-0 fz14">Total budget</p>
                <h3 className="mb5">${total}</h3>
                <p className="text fz14 mb20">
                  ${p.budgetPerVideo} per video × {p.videoCount}
                </p>
                <div className="d-flex justify-content-between py-2 bdrb1">
                  <span className="text">Deadline</span>
                  <span className="fw500 dark-color">{formatDate(p.deadline)}</span>
                </div>
                <div className="d-flex justify-content-between py-2">
                  <span className="text">Time left</span>
                  <span className="fw500 dark-color">
                    {daysLeft > 1 ? `${daysLeft} days` : daysLeft === 1 ? "1 day" : "Ended"}
                  </span>
                </div>
                {isOwner && p.isOpen && (
                  <>
                    <Link href={inviteHref(p)} className="ud-btn btn-thm w-100 mt20">
                      Find & invite freelancers
                      <i className="fal fa-arrow-right-long" />
                    </Link>
                    <p className="text fz14 text-center mt10 mb-0">
                      {invitations.length > 0
                        ? [
                            `${invitations.length} invited`,
                            `${invitations.filter((i) => i.proposed).length} sent a proposal`,
                            invitations.some((i) => i.declinedAt && !i.proposed) &&
                              `${invitations.filter((i) => i.declinedAt && !i.proposed).length} declined`,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : "Pick freelancers you'd like a proposal from"}
                    </p>
                  </>
                )}
              </div>

              <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
                <h5 className="mb15">About the client</h5>
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
                    <Link
                      href={`/employee-single/${encodeURIComponent(p.client.username)}`}
                      className="fw500 dark-color d-block"
                    >
                      {p.client.displayName}
                    </Link>
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
      </section>
      <Footer />
    </>
  );
}
