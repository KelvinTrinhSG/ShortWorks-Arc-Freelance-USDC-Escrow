import { VIDEO_LENGTHS, WORK_TYPES } from "@/data/projectOptions";
import { PLATFORMS, REVISIONS, labelOf } from "@/data/talentOptions";
import Image from "next/image";
import Link from "next/link";

const days = (n) => (n === 1 ? "1-day delivery" : `${n}-day delivery`);

// One service on /services. Also the live preview in the Add Service form, where
// the draft has no id, freelancer or samples yet.
export default function ServiceCard({ service, freelancer }) {
  const s = service;
  const owner = s.freelancer ?? freelancer;
  const href = s.id ? `/services/${s.id}` : null;
  const price = Number(s.pricePerVideo) || 0;
  const scope = [
    s.workType && labelOf(WORK_TYPES, s.workType),
    s.platforms?.length > 0 && s.platforms.map((p) => labelOf(PLATFORMS, p)).join(", "),
    s.videoLength && labelOf(VIDEO_LENGTHS, s.videoLength),
  ].filter(Boolean);
  const title = s.title || "Untitled service";

  return (
    <div className="bdr1 bdrs8 bgc-white hover-box-shadow h-100 d-flex flex-column overflow-hidden">
      {/* Cover: the first sample video, or a placeholder */}
      <div className="bgc-thm4 position-relative" style={{ aspectRatio: "16 / 9" }}>
        {s.coverEmbedUrl ? (
          <iframe
            src={s.coverEmbedUrl}
            title={`${title} sample`}
            loading="lazy"
            allow="encrypted-media; picture-in-picture"
            style={{ width: "100%", height: "100%", border: 0, pointerEvents: "none" }}
            tabIndex={-1}
          />
        ) : (
          <div className="d-flex h-100 align-items-center justify-content-center">
            <span className="flaticon-video-file text-thm" style={{ fontSize: 42 }} />
          </div>
        )}
        {href && <Link href={href} className="position-absolute top-0 start-0 w-100 h-100" aria-label={title} />}
      </div>

      <div className="p20 d-flex flex-column flex-grow-1">
        {owner && (
          <div className="d-flex align-items-center gap-2 mb10">
            <Image
              src={owner.avatarUrl || "/images/resource/default-avatar.svg"}
              alt={owner.displayName}
              width={28}
              height={28}
              className="rounded-circle"
              style={{ objectFit: "cover" }}
              unoptimized
            />
            <span className="fz14 dark-color fw500 text-truncate">{owner.displayName}</span>
          </div>
        )}
        <h5 className="mb10" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {href ? (
            <Link href={href} className="dark-color">
              {title}
            </Link>
          ) : (
            title
          )}
        </h5>
        {scope.length > 0 && <p className="text-thm fz14 mb5">{scope.join(" · ")}</p>}
        <p className="fz13 text mb15">
          {[s.deliveryDays && `⏱ ${days(Number(s.deliveryDays))}`, s.revisions !== undefined && s.revisions !== "" && `↻ ${labelOf(REVISIONS, Number(s.revisions))}`, s.orderCount > 0 && `${s.orderCount} ${s.orderCount === 1 ? "order" : "orders"}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-auto d-flex justify-content-between align-items-center pt10 bdrt1">
          <span className="fz14 text">Price</span>
          <span className="fz17 fw600 dark-color">
            {price > 0 ? `$${price}` : "$—"}
            <span className="fz13 text fw400"> / video</span>
          </span>
        </div>
      </div>
    </div>
  );
}
