// Recognise TikTok / Reels / Shorts / Facebook links and build an embeddable URL.
// Returns null for anything else. `embedUrl` is null when the link is valid but
// can't be embedded directly (e.g. vm.tiktok.com short links).
export function parseVideoUrl(input) {
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\.|^m\./, "");
  const path = url.pathname;

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const id = path.match(/\/video\/(\d+)/)?.[1];
    return {
      platform: "tiktok",
      embedUrl: id ? `https://www.tiktok.com/embed/v2/${id}` : null,
    };
  }

  if (host === "instagram.com") {
    const code = path.match(/^\/(?:reels?|p)\/([\w-]+)/)?.[1];
    return {
      platform: "reels",
      embedUrl: code ? `https://www.instagram.com/reel/${code}/embed` : null,
    };
  }

  if (host === "youtube.com" || host === "youtu.be") {
    const id =
      host === "youtu.be"
        ? path.slice(1)
        : path.match(/^\/shorts\/([\w-]+)/)?.[1] || url.searchParams.get("v");
    return {
      platform: "shorts",
      embedUrl: id ? `https://www.youtube.com/embed/${id}` : null,
    };
  }

  if (host === "facebook.com" || host === "fb.watch") {
    return {
      platform: "facebook",
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.href)}`,
    };
  }

  return null;
}
