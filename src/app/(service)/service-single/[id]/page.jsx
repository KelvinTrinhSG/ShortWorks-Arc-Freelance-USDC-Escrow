import Footer from "@/components/footer/Footer";
import Header20 from "@/components/header/Header20";
import VideoFrame from "@/components/project/VideoFrame";
import ServiceOrderBox from "@/components/service/ServiceOrderBox";
import { PLATFORM_FEE_PERCENT, VIDEO_LENGTHS, WORK_TYPES } from "@/data/projectOptions";
import { PLATFORMS, REVISIONS, labelOf } from "@/data/talentOptions";
import { getService } from "@/lib/services";
import { getViewer } from "@/lib/viewer";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

async function load(params) {
  const { id } = await params;
  const viewer = await getViewer();
  const data = await getService(id, viewer);
  return data && { ...data, viewer };
}

export async function generateMetadata({ params }) {
  const data = await load(params);
  return {
    title: data ? `${data.service.title} | ShortWorks` : "ShortWorks - Service not found",
    description: data?.service.description.slice(0, 160),
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

// A freelancer's service: what's included, samples, and the order box (docs/services.md).
export default async function ServicePage({ params }) {
  const data = await load(params);
  // Unknown, or paused and not yours.
  if (!data) notFound();
  const { service: s, isOwner, viewer } = data;
  const f = s.freelancer;
  const role = isOwner ? "owner" : !viewer ? "guest" : viewer.accountType === "client" ? "client" : "freelancer";

  return (
    <>
      <Header20 />
      <section className="pt30 pb90">
        <div className="container">
          <Link href="/service-4" className="fz14 text-thm">
            ← All services
          </Link>

          <div className="mt15 mb30">
            <h2 className="mb10">{s.title}</h2>
            <p className="text mb-0">
              By{" "}
              <Link href={`/talents/${encodeURIComponent(f.username)}`} className="text-thm">
                {f.displayName}
              </Link>
              {s.orderCount > 0 && ` · ${s.orderCount} ${s.orderCount === 1 ? "order" : "orders"}`}
              {s.status !== "active" && <span className="badge bg-secondary ms-2">Paused</span>}
            </p>
          </div>

          <div className="row">
            <div className="col-lg-8">
              <div className="row">
                <Fact icon="flaticon-notification-1" title="Type of work">
                  {labelOf(WORK_TYPES, s.workType)}
                </Fact>
                <Fact icon="flaticon-goal" title="Platforms">
                  {s.platforms.map((x) => labelOf(PLATFORMS, x)).join(", ")}
                </Fact>
                <Fact icon="flaticon-fifteen" title="Video length">
                  {labelOf(VIDEO_LENGTHS, s.videoLength)} · 9:16
                </Fact>
                <Fact icon="flaticon-dollar" title="Price">
                  ${s.pricePerVideo} / video
                </Fact>
                <Fact icon="flaticon-30-days" title="Delivery">
                  {s.deliveryDays} {s.deliveryDays === 1 ? "day" : "days"} for the whole order
                </Fact>
                <Fact icon="flaticon-review" title="Revisions">
                  {labelOf(REVISIONS, s.revisions)}
                </Fact>
              </div>

              <div className="service-about">
                <h4>About this service</h4>
                <p className="text mb30" style={{ whiteSpace: "pre-line" }}>
                  {s.description}
                </p>

                {s.samples.length > 0 && (
                  <>
                    <hr className="opacity-100 mb40 mt20" />
                    <h4 className="mb20">Sample videos</h4>
                    <div className="row">
                      {s.samples.map((v, i) => (
                        <div key={v.url} className="col-6 col-md-4 mb20">
                          <VideoFrame url={v.url} embedUrl={v.embedUrl} title={`Sample video ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <hr className="opacity-100 mb40 mt20" />
                <h4 className="mb20">How ordering works</h4>
                <ol className="ps-3 text mb-0">
                  <li className="mb10">Pick the number of videos and write your brief.</li>
                  <li className="mb10">Pay with PayPal: the money is <strong>held</strong>, not taken yet.</li>
                  <li className="mb10">
                    {f.displayName} delivers within {s.deliveryDays} {s.deliveryDays === 1 ? "day" : "days"}. You
                    approve or ask for changes ({labelOf(REVISIONS, s.revisions).toLowerCase()} included).
                  </li>
                  <li className="mb10">
                    When you approve, the freelancer is paid. Something wrong? Open a dispute and ShortWorks
                    decides within 48 hours.{" "}
                    <Link href="/terms" className="text-thm">
                      Terms
                    </Link>
                  </li>
                </ol>
                {isOwner && (
                  <p className="fz13 text mt15 mb-0">
                    You receive each order&apos;s total minus the {PLATFORM_FEE_PERCENT}% platform fee and PayPal&apos;s fee.
                  </p>
                )}
              </div>
            </div>

            <div className="col-lg-4">
              <div style={{ position: "sticky", top: 100 }}>
                <ServiceOrderBox service={s} viewer={role} />

                <div className="bgc-white bdrs12 p30 mb30 default-box-shadow1">
                  <h5 className="mb15">About the freelancer</h5>
                  <div className="d-flex align-items-center gap-3">
                    <Image
                      src={f.avatarUrl || "/images/resource/default-avatar.svg"}
                      alt={f.displayName}
                      width={56}
                      height={56}
                      className="rounded-circle"
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                    <div style={{ minWidth: 0 }}>
                      <Link href={`/talents/${encodeURIComponent(f.username)}`} className="fw500 dark-color">
                        {f.displayName}
                      </Link>
                      <p className="fz14 text mb-0">
                        {[f.headline, f.country].filter(Boolean).join(" · ") ||
                          `Member since ${new Date(f.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                      </p>
                    </div>
                  </div>
                  <Link href={`/talents/${encodeURIComponent(f.username)}`} className="ud-btn btn-light-thm w-100 mt20">
                    View profile & portfolio
                  </Link>
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
