import { describe, expect, it } from "vitest";
import { parseReelUrl } from "./reels";

describe("parseReelUrl", () => {
  it("normalizes YouTube Shorts and watch URLs", () => {
    expect(parseReelUrl("https://youtube.com/shorts/abcDEF_1234")?.embedUrl)
      .toBe("https://www.youtube-nocookie.com/embed/abcDEF_1234");
    expect(parseReelUrl("https://www.youtube.com/watch?v=abcDEF_1234")?.platform)
      .toBe("youtube");
  });

  it("builds the official TikTok player URL", () => {
    expect(parseReelUrl("https://www.tiktok.com/@player/video/6718335390845095173"))
      .toMatchObject({
        platform: "tiktok",
        embedUrl: "https://www.tiktok.com/player/v1/6718335390845095173",
      });
  });

  it("rejects unsupported, insecure, and malformed URLs", () => {
    expect(parseReelUrl("https://example.com/video/123")).toBeNull();
    expect(parseReelUrl("http://youtu.be/abcDEF_1234")).toBeNull();
    expect(parseReelUrl("not a URL")).toBeNull();
  });
});
