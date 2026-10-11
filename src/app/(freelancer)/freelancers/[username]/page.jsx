import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import {
  AVAILABILITY,
  COUNTRIES,
  LANGUAGES,
  NICHES,
  PLATFORMS,
  REVISIONS,
  ROLES,
  TIMEZONES,
  TOOLS,
  TURNAROUND,
  VIDEO_ROLES,
  labelOf,
} from "@/data/talentOptions";
import InviteButton from "@/components/talent/InviteButton";
import { getFreelancerByUsername, getInviteOptions } from "@/lib/invitations";
import { getSession } from "@/lib/session";
import { getPublicProfile } from "@/lib/talents";
import { getViewer } from "@/lib/viewer";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

async function load(params) {
  const { username } = await params;
  const session = await getSession();
  return getPublicProfile(decodeURIComponent(username), session?.userId);
}

// For a client: their open projects to invite this freelancer to. The project from
// ?invite= (when they came from the invite list) goes first. null for everyone else.
async function loadInviteOptions(username, inviteId) {
  const viewer = await getViewer();
  if (viewer?.accountType !== "client") return null;
  const freelancer = await getFreelancerByUsername(username);
  if (!freelancer) return null;
  const projects = await getInviteOptions(viewer.id, freelancer.id);
  const from = projects.find((p) => String(p.id) === inviteId);
  return from ? [from, ...projects.filter((p) => p !== from)] : projects;
}

export async function generateMetadata({ params }) {
  const data = await load(params);
  if (!data) return { title: "ShortWorks - Talent not found" };
  const { talent } = data;
  return {
    title: talent.headline
      ? `${talent.displayName} - ${talent.headline} | ShortWorks`
      : `${talent.displayName} | ShortWorks`,
    description: talent.bio || talent.headline,
  };
}

function Tags({ items, options }) {
  return (
    <div className="d-flex flex-wrap gap-2">
      {items.map((v) => (
        <span key={v} className="tag bgc-thm4 px-3 py-1 bdrs60 fz14">
          {labelOf(options, v)}
        </span>
      ))}
    </div>
  );
}

function Fact({ label, children }) {
  return (
    <div className="d-flex justify-content-between py-2 bdrb1">
      <span className="text">{label}</span>
      <span className="fw500 dark-color text-end">{children}</span>
    </div>
  );
}

export default async function TalentPage({ params, searchParams }) {
  const data = await load(params);
  if (!data) notFound();
  const { talent, videos, complete, isOwner } = data;
  const { invite } = await searchParams;
  const inviteId = typeof invite === "string" && /^\d+$/.test(invite) ? invite : null;
  const inviteOptions = await loadInviteOptions(talent.username, inviteId);
  // Came from the invite list: go back there instead of the plain talent list.
  const backHref =
    inviteId && inviteOptions?.some((p) => String(p.id) === inviteId)
      ? `/freelancers?invite=${inviteId}`
      : "/freelancers";

  // Any of these may still be empty; only filled-in groups are shown.
  const expertise = [
    { title: "Platforms", items: talent.platforms, options: PLATFORMS },
    { title: "Niches", items: talent.niches, options: NICHES },
    { title: "Tools", items: talent.tools, options: TOOLS },
    { title: "Languages", items: talent.languages, options: LANGUAGES },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <Header20 />
      <section className="pt30 pb90">
        <div className="container">
          {isOwner && (
            <div
              className={`alert ${complete ? "alert-success" : "alert-warning"} d-flex flex-wrap justify-content-between align-items-center gap-2`}
            >
              <span>
                {complete
                  ? "This is your public profile, as clients see it."
                  : "This is your public profile. Fill in the missing items so clients find you first."}
              </span>
              <Link href="/my-profile" className="fw500">
                Edit profile →
              </Link>
            </div>
          )}

          {/* Header */}
          <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1 d-sm-flex align-items-center gap-4">
            <Image
              src={talent.avatarUrl || "/images/resource/default-avatar.svg"}
              alt={talent.displayName}
              width={110}
              height={110}
              className="rounded-circle mb20-sm"
              style={{ objectFit: "cover" }}
              unoptimized
            />
            <div className="flex-grow-1">
              <h2 className="mb5">{talent.displayName}</h2>
              {talent.roles.length > 0 && (
                <p className="text-thm fw500 mb10">
                  {talent.roles.map((r) => labelOf(ROLES, r)).join(" · ")}
                </p>
              )}
              {talent.headline && (
                <p className="fz17 dark-color mb10">{talent.headline}</p>
              )}
              <p className="text fz14 mb-0">
                {labelOf(AVAILABILITY, talent.availability)}
                {talent.country && <> · {labelOf(COUNTRIES, talent.country)}</>}
                {talent.timezone && <> · {labelOf(TIMEZONES, talent.timezone)}</>}
              </p>
            </div>
            {talent.startingPrice !== null && (
              <div className="text-sm-end mt20 mt-sm-0">
                <p className="text mb-0 fz14">Starting at</p>
                <h3 className="mb-0">${talent.startingPrice}</h3>
                <p className="text fz14 mb-0">per video</p>
              </div>
            )}
          </div>

          <div className="row">
            <div className="col-lg-8">
              {/* Portfolio */}
              {videos.length > 0 && (
                <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
                  <h4 className="mb20">Portfolio</h4>
                  <div className="row">
                    {videos.map((v, i) => (
                      <div key={v.id} className="col-6 col-md-4 mb20">
                        <div
                          className="bdrs8 overflow-hidden bgc-thm4"
                          style={{ aspectRatio: "9 / 16" }}
                        >
                          {v.embedUrl ? (
                            <iframe
                              src={v.embedUrl}
                              title={`${talent.displayName} video ${i + 1}`}
                              loading="lazy"
                              allow="encrypted-media; picture-in-picture"
                              allowFullScreen
                              style={{ width: "100%", height: "100%", border: 0 }}
                            />
                          ) : (
                            <a
                              href={v.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="d-flex h-100 align-items-center justify-content-center"
                            >
                              Open video ↗
                            </a>
                          )}
                        </div>
                        <p className="fz14 fw500 mt10 mb-0">
                          {labelOf(PLATFORMS, v.platform)} · {labelOf(NICHES, v.niche)}
                        </p>
                        {v.role && (
                          <p className="fz13 text mb-0">{labelOf(VIDEO_ROLES, v.role)}</p>
                        )}
                        {v.result && <p className="fz13 text-thm mb-0">{v.result}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {talent.bio && (
                <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
                  <h4 className="mb15">About</h4>
                  <p className="text mb-0" style={{ whiteSpace: "pre-line" }}>
                    {talent.bio}
                  </p>
                </div>
              )}
            </div>

            <div className="col-lg-4">
              {inviteOptions && (
                <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
                  <h4 className="mb10">Invite to a project</h4>
                  {inviteOptions.length === 0 ? (
                    <>
                      <p className="text fz14 mb20">
                        You have no open projects. Post one, then invite{" "}
                        {talent.displayName} to send a proposal.
                      </p>
                      <Link href="/projects/new" className="ud-btn btn-thm w-100">
                        Create Project
                        <i className="fal fa-arrow-right-long" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text fz14 mb15">
                        {talent.availability === "available"
                          ? `${talent.displayName} gets the project in their invitations and can send you a proposal.`
                          : `${talent.displayName} is not available for work right now, so they can't be invited.`}
                      </p>
                      {inviteOptions.map((p) => (
                        <div key={p.id} className="py-3 bdrt1">
                          <Link
                            href={`/projects/${p.id}`}
                            className="d-block fw500 dark-color mb10 text-truncate"
                            title={p.title}
                          >
                            {p.title}
                          </Link>
                          <InviteButton
                            projectId={p.id}
                            username={talent.username}
                            initial={p.status}
                            available={talent.availability === "available"}
                            redirectAfterInvite
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
                <h4 className="mb15">
                  {talent.startingPrice !== null || talent.turnaroundHours
                    ? "Pricing & delivery"
                    : "Details"}
                </h4>
                {talent.startingPrice !== null && (
                  <Fact label="Starting price">${talent.startingPrice} / video</Fact>
                )}
                {talent.turnaroundHours && (
                  <Fact label="Delivery time">
                    {labelOf(TURNAROUND, talent.turnaroundHours)}
                  </Fact>
                )}
                {talent.freeRevisions !== null && (
                  <Fact label="Free revisions">
                    {labelOf(REVISIONS, talent.freeRevisions)}
                  </Fact>
                )}
                <Fact label="Member since">
                  {new Date(talent.memberSince).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </Fact>
              </div>

              {expertise.length > 0 && (
                <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
                  <h4 className="mb15">Expertise</h4>
                  {expertise.map(({ title, items, options }) => (
                    <div key={title} className="mb20">
                      <h6 className="mb10">{title}</h6>
                      <Tags items={items} options={options} />
                    </div>
                  ))}
                </div>
              )}

              <Link href={backHref} className="ud-btn btn-light-thm w-100">
                {backHref === "/freelancers" ? "Back to all talents" : "Back to invite list"}
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
