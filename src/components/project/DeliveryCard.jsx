import { parseVideoUrl } from "@/lib/videoUrl";
import VideoFrame from "./VideoFrame";

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// Where a non-embeddable link points, for its tile.
function sourceOf(url) {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  if (host.includes("drive.google")) return { name: "Google Drive", icon: "fab fa-google-drive" };
  if (host.includes("dropbox")) return { name: "Dropbox", icon: "fab fa-dropbox" };
  return { name: host || "Link", icon: "fal fa-link" };
}

// One hand-in on a job: who, when, the videos (previewed when the link can be embedded)
// and the note. `approved` marks the delivery the client accepted.
export default function DeliveryCard({ delivery, number, latest, approved, byLabel }) {
  const accent = approved ? "#15803d" : "#5bbb7b";

  return (
    <div
      className="bgc-white bdrs12 mb30 overflow-hidden default-box-shadow1"
      style={{ border: "1px solid #e3efe7", borderTop: `4px solid ${accent}` }}
    >
      {/* Header */}
      <div
        className="d-flex flex-wrap align-items-center gap-3 px30 py20"
        style={{ background: "linear-gradient(90deg, #f0faf3 0%, #ffffff 100%)" }}
      >
        <span
          className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0 text-white fw600"
          style={{ width: 44, height: 44, background: accent, fontSize: 20 }}
        >
          ✓
        </span>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <h5 className="mb-0 d-flex flex-wrap align-items-center gap-2">
            Delivery {number}
            {latest && (
              <span className="badge rounded-pill fw500" style={{ background: "#222", fontSize: 11 }}>
                Latest
              </span>
            )}
            {approved && (
              <span
                className="badge rounded-pill fw500"
                style={{ color: "#15803d", background: "#e3f6ea", fontSize: 11 }}
              >
                Approved ✓
              </span>
            )}
          </h5>
          <p className="fz13 text mb-0">
            Submitted by {byLabel} · {formatDateTime(delivery.createdAt)} · {delivery.links.length}{" "}
            {delivery.links.length === 1 ? "video" : "videos"}
          </p>
        </div>
      </div>

      <div className="px30 pt20 pb10">
        {/* Videos */}
        <div className="row">
          {delivery.links.map((url, i) => {
            const embedUrl = parseVideoUrl(url)?.embedUrl;
            const source = sourceOf(url);
            return (
              <div key={`${i}-${url}`} className="col-6 col-md-4 col-xl-3 mb20">
                {embedUrl ? (
                  <VideoFrame url={url} embedUrl={embedUrl} title={`Delivered video ${i + 1}`} />
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="d-flex flex-column align-items-center justify-content-center text-center bdrs8 p15 h-100"
                    style={{ aspectRatio: "9 / 16", background: "#f7f7f7", border: "1px dashed #d6d6d6" }}
                  >
                    <span className={`${source.icon} text-thm mb10`} style={{ fontSize: 28 }} />
                    <span className="fz13 dark-color fw500 text-break">{source.name}</span>
                    <span className="fz13 text-thm mt5">Open ↗</span>
                  </a>
                )}
                <div className="d-flex justify-content-between align-items-center mt5">
                  <span className="fz13 fw500 dark-color">Video {i + 1}</span>
                  <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="fz13 text-thm">
                    Open ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note */}
        {delivery.note && (
          <div
            className="bdrs8 p15 mb20"
            style={{ background: "#f8f9fa", borderLeft: `3px solid ${accent}` }}
          >
            <p className="fz13 text mb5">Note from {byLabel}</p>
            <p className="fz14 dark-color mb-0" style={{ whiteSpace: "pre-line" }}>
              {delivery.note}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
