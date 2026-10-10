// A 9:16 frame that embeds a short-form video, or links out when it can't be embedded.
export default function VideoFrame({ url, embedUrl, title }) {
  return (
    <div className="bdrs8 overflow-hidden bgc-thm4" style={{ aspectRatio: "9 / 16" }}>
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={title}
          loading="lazy"
          allow="encrypted-media; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="d-flex h-100 align-items-center justify-content-center"
        >
          Open video ↗
        </a>
      )}
    </div>
  );
}
