import Image from "next/image";
import Link from "next/link";
import { formatDate, timeAgo } from "./ProjectCard";
import VideoFrame from "./VideoFrame";

const STATUS = {
  pending: { className: "bg-secondary", label: "Pending" },
  accepted: { className: "bg-success", label: "Accepted" },
  declined: { className: "bg-danger", label: "Declined" },
};

// One proposal: who sent it, price, delivery, cover letter and sample video.
// `actions` is rendered at the bottom (Accept/Decline for the client,
// Edit/Withdraw for the freelancer).
export default function ProposalCard({ proposal, videoCount, now, actions }) {
  const f = proposal.freelancer;
  const total = Math.round(proposal.pricePerVideo * videoCount * 100) / 100;
  const status = STATUS[proposal.status] ?? STATUS.pending;

  return (
    <div className={`bdr1 bdrs8 p20 mb20 bgc-white ${proposal.status === "accepted" ? "border-success" : ""}`}>
      <div className="d-sm-flex justify-content-between align-items-start gap-3">
        <div className="d-flex align-items-center gap-3 mb15">
          <Image
            src={f.avatarUrl || "/images/resource/default-avatar.svg"}
            alt={f.displayName}
            width={56}
            height={56}
            className="rounded-circle"
            style={{ objectFit: "cover" }}
            unoptimized
          />
          <div>
            <Link href={`/freelancers/${encodeURIComponent(f.username)}`} className="fw500 dark-color">
              {f.displayName}
            </Link>
            {f.headline && <p className="fz14 text mb-0">{f.headline}</p>}
            <p className="fz13 text mb-0">
              {[f.country, `sent ${timeAgo(proposal.createdAt, now)}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="text-sm-end mb15">
          <h5 className="mb-0">${proposal.pricePerVideo} / video</h5>
          <p className="fz14 text mb-0">
            Total ${total} · by {formatDate(proposal.deliveryDate)}
          </p>
          <span className={`badge ${status.className} mt5`}>{status.label}</span>
        </div>
      </div>
      <p className="text mb-0" style={{ whiteSpace: "pre-line" }}>
        {proposal.coverLetter}
      </p>
      {proposal.sampleUrl && (
        <div className="mt15" style={{ maxWidth: 200 }}>
          <VideoFrame
            url={proposal.sampleUrl}
            embedUrl={proposal.sampleEmbedUrl}
            title={`Sample video from ${f.displayName}`}
          />
        </div>
      )}
      {actions && <div className="mt15">{actions}</div>}
    </div>
  );
}
