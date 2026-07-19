import type { Reel, ReelPlatform } from "./types";

export interface ParsedReelUrl {
  platform: ReelPlatform;
  canonicalUrl: string;
  embedUrl: string | null;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

/** Parse only providers Backline can safely render without an API secret. */
export function parseReelUrl(input: string): ParsedReelUrl | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "youtu.be" || host === "youtube.com" || host === "m.youtube.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = host === "youtu.be"
      ? parts[0]
      : parts[0] === "shorts" || parts[0] === "embed"
        ? parts[1]
        : url.searchParams.get("v");
    if (!id || !YOUTUBE_ID.test(id)) return null;
    return {
      platform: "youtube",
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    };
  }

  if (host === "tiktok.com" || host === "m.tiktok.com") {
    const match = url.pathname.match(/(?:\/video\/|\/player\/v1\/)(\d+)/);
    if (!match) return null;
    const id = match[1];
    return {
      platform: "tiktok",
      canonicalUrl: input.trim(),
      embedUrl: `https://www.tiktok.com/player/v1/${id}`,
    };
  }

  return null;
}

export function reelEmbedUrl(reel: Reel): string | null {
  return parseReelUrl(reel.url)?.embedUrl ?? null;
}
