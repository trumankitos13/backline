// Short-form video components. The prototype has no real video assets, so a
// clip renders as a gradient "frame" with animated equalizer bars; the reel
// viewer simulates playback with a timed progress bar. Swapping in real
// <video> elements later only touches this file.

import { useEffect, useState } from "react";
import type { VideoClip } from "../lib/types";
import {
  CloseIcon,
  CommentIcon,
  HeartIcon,
  PlayIcon,
  ShareIcon,
} from "./icons";
import { formatCount, formatDuration } from "./ui";

/** deterministic pseudo-random bar heights per clip id */
function barHeights(id: string, count: number): number[] {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 137 + 71) % 9973;
    out.push(0.25 + (h % 70) / 100);
  }
  return out;
}

function EqBars({
  clip,
  count,
  paused = false,
  className = "",
}: {
  clip: VideoClip;
  count: number;
  paused?: boolean;
  className?: string;
}) {
  const heights = barHeights(clip.id, count);
  return (
    <div
      className={`flex items-end justify-center gap-1 ${paused ? "eq-paused" : ""} ${className}`}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="eq-bar w-1.5 rounded-full bg-white/70"
          style={{
            height: `${h * 100}%`,
            animationDelay: `${(i * 97) % 900}ms`,
            animationDuration: `${700 + ((i * 53) % 500)}ms`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * A 9:16 video tile for reels rows and feed embeds.
 * onPlay should open the ReelViewer.
 */
export function VideoTile({
  clip,
  onPlay,
  className = "",
  showStats = true,
}: {
  clip: VideoClip;
  onPlay?: () => void;
  className?: string;
  showStats?: boolean;
}) {
  const [from, to] = clip.palette;
  return (
    <button
      onClick={onPlay}
      className={`group relative aspect-[9/16] shrink-0 overflow-hidden rounded-xl text-left ${className}`}
      style={{ background: `linear-gradient(160deg, ${from}cc, ${to})` }}
      aria-label={`Play video: ${clip.title}`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
      <EqBars clip={clip} count={7} paused className="absolute inset-x-4 top-1/4 bottom-1/2 opacity-80" />
      {/* play button */}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full bg-black/45 p-2.5 backdrop-blur-sm transition-transform group-hover:scale-110">
          <PlayIcon size={18} className="text-white" />
        </span>
      </span>
      {/* meta */}
      <span className="absolute inset-x-2 bottom-2 flex flex-col gap-0.5">
        <span className="line-clamp-2 text-xs leading-tight font-medium text-white">{clip.title}</span>
        {showStats && (
          <span className="text-[10px] text-white/70">
            ▶ {formatCount(clip.plays)} · {formatDuration(clip.durationSec)}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Full-screen short-form reel viewer with simulated playback.
 * Pass the list of clips and the index to start at.
 */
export function ReelViewer({
  clips,
  startIndex = 0,
  ownerName,
  onClose,
}: {
  clips: VideoClip[];
  startIndex?: number;
  ownerName?: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const clip = clips[index];

  // auto-advance when the simulated clip finishes
  useEffect(() => {
    if (!clip) return;
    const t = window.setTimeout(() => {
      setIndex((i) => (i + 1 < clips.length ? i + 1 : i));
    }, clip.durationSec * 1000);
    return () => window.clearTimeout(t);
  }, [index, clip, clips.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowDown")
        setIndex((i) => Math.min(i + 1, clips.length - 1));
      if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [clips.length, onClose]);

  if (!clip) return null;
  const [from, to] = clip.palette;
  const isLiked = liked[clip.id] ?? false;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95">
      {/* click zones for prev/next */}
      <div className="absolute inset-y-0 left-0 w-1/4" onClick={() => setIndex((i) => Math.max(i - 1, 0))} />
      <div
        className="absolute inset-y-0 right-0 w-1/4"
        onClick={() => setIndex((i) => Math.min(i + 1, clips.length - 1))}
      />

      <div
        className="relative aspect-[9/16] h-[92vh] max-w-[94vw] overflow-hidden rounded-2xl"
        style={{ background: `linear-gradient(165deg, ${from}, ${to})` }}
      >
        {/* progress bars */}
        <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
          {clips.map((c, i) => (
            <div key={c.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              {i < index && <div className="h-full w-full bg-white" />}
              {i === index && (
                <div
                  key={clip.id}
                  className="reel-progress h-full bg-white"
                  style={{ animationDuration: `${clip.durationSec}s` }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" />
        <EqBars clip={clip} count={12} className="absolute inset-x-8 top-[22%] bottom-[45%]" />

        {/* caption */}
        <div className="absolute inset-x-4 bottom-4 z-10 pr-14">
          {ownerName && <p className="text-sm font-semibold text-white">{ownerName}</p>}
          <p className="mt-0.5 text-sm text-white/90">{clip.title}</p>
          <p className="mt-1 text-xs text-white/60">
            ▶ {formatCount(clip.plays)} plays · {clip.tags.map((t) => `#${t}`).join(" ")}
          </p>
        </div>

        {/* action rail */}
        <div className="absolute right-3 bottom-16 z-10 flex flex-col items-center gap-4">
          <button
            onClick={() => setLiked((l) => ({ ...l, [clip.id]: !isLiked }))}
            className="flex flex-col items-center gap-1 text-white"
            aria-label="Like"
          >
            <HeartIcon size={26} filled={isLiked} className={isLiked ? "text-red-500" : ""} />
            <span className="text-[11px]">{formatCount(clip.likes + (isLiked ? 1 : 0))}</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-white" aria-label="Comment">
            <CommentIcon size={25} />
            <span className="text-[11px]">42</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-white" aria-label="Share">
            <ShareIcon size={25} />
            <span className="text-[11px]">Share</span>
          </button>
        </div>
      </div>

      <button
        onClick={onClose}
        aria-label="Close reel"
        className="absolute top-4 right-4 z-20 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20"
      >
        <CloseIcon size={20} />
      </button>
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/40">
        {index + 1} / {clips.length} · tap sides or use arrow keys
      </p>
    </div>
  );
}
