// A single cell in the Discover reels grid. The tile itself is the player's
// first reel (the generative "gel" composition via VideoTile) at a ~3/4 crop;
// tapping it opens the fullscreen ReelViewer with all of the player's reels.
// The footer beneath carries the identity data layer — name, verified mark,
// Uber-style rating, mono distance — and taps through to the player profile.
//
// Backline: amber "FREE" flag only when free tonight (amber stays scarce), cyan
// verified mark, mono for every data atom.

import { useNavigate } from "react-router-dom";
import type { Player } from "../../lib/types";
import { useApp } from "../../lib/store";
import { ratingSummary } from "../../lib/ratings";
import { Mono, RatingNumber } from "../ui";
import { VerifiedIcon } from "../icons";
import { VideoTile } from "../video";

export function ReelGridTile({
  player: p,
  onOpenReel,
}: {
  player: Player;
  onOpenReel: (player: Player) => void;
}) {
  const navigate = useNavigate();
  const { state } = useApp();
  const rating = ratingSummary(p, state.ratingsGiven[p.id]);
  const clip = p.videos[0];
  if (!clip) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* reel tile → fullscreen viewer. VideoTile is 9:16; force it to fill a
          3/4 wrapper so the gel composition reflows to the grid crop. */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
        <VideoTile
          clip={clip}
          onPlay={() => onOpenReel(p)}
          className="absolute! inset-0 h-full w-full"
        />
        {p.availableTonight && (
          <span className="pointer-events-none absolute top-2 left-2 z-10">
            <Mono className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-ink-near shadow-[0_4px_16px_-4px_var(--accent)]">
              Free
            </Mono>
          </span>
        )}
      </div>

      {/* footer → player profile */}
      <button
        onClick={() => navigate(`/m/${p.id}`)}
        className="min-w-0 text-left"
        aria-label={`Open ${p.name}'s profile`}
      >
        <span className="flex items-center gap-1">
          <span className="truncate text-sm font-semibold text-text-hi">{p.name}</span>
          {p.verified && <VerifiedIcon size={13} className="shrink-0" />}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <RatingNumber avg={rating.avg} count={rating.count} size="sm" />
          <Mono className="text-[11px] text-text-lo">{p.distanceMiles} MI</Mono>
        </span>
      </button>
    </div>
  );
}
