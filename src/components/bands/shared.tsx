// Shared pieces for the bands/venues surfaces: follow button, gig rows,
// and open-slot urgency helpers. Used by Bands, BandDetail, and VenueDetail.

import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import type { Gig } from "../../lib/types";
import { getBand, getVenue } from "../../lib/data";
import { useApp } from "../../lib/store";
import { Button } from "../ui";
import { CheckIcon, PlusIcon } from "../icons";

// ----------------------------------------------------------- slot urgency

/** open-slot notes that start with "URGENT" get the SOS treatment */
export function isUrgent(note: string): boolean {
  return /^urgent/i.test(note);
}

/** strip the leading "URGENT:" so the badge doesn't repeat the word */
export function slotNoteText(note: string): string {
  return note.replace(/^urgent:?\s*/i, "");
}

export function UrgentBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-red-300 uppercase">
      <span className="glow-pulse h-1.5 w-1.5 rounded-full bg-red-400" />
      Urgent
    </span>
  );
}

// ---------------------------------------------------------- follow button

/** Follow/Following toggle for a band or venue id, wired to the store. */
export function FollowButton({
  id,
  size = "sm",
  className = "",
}: {
  id: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { state, api } = useApp();
  const following = state.following.includes(id);
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    // cards are clickable — don't navigate when toggling
    e.stopPropagation();
    api.toggleFollow(id);
  };
  return (
    <Button
      size={size}
      variant={following ? "secondary" : "primary"}
      onClick={onClick}
      aria-pressed={following}
      className={className}
    >
      {following ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}

// --------------------------------------------------------------- gig rows

/**
 * One upcoming gig as a row: date block, title, and a cross-link — to the
 * venue (on band pages) or to the band (on venue pages).
 */
export function GigRow({ gig, link }: { gig: Gig; link: "venue" | "band" }) {
  const venue = getVenue(gig.venueId);
  const band = gig.bandId ? getBand(gig.bandId) : undefined;
  const tonight = gig.date === "Tonight";
  const [dayOfWeek, ...restOfDate] = gig.date.split(" ");

  return (
    <div className="flex items-center gap-3 p-3.5 sm:p-4">
      <div
        className={`w-16 shrink-0 rounded-xl border px-1 py-2 text-center ${
          tonight
            ? "border-amber-400/40 bg-amber-400/10"
            : "border-zinc-800 bg-zinc-800/40"
        }`}
      >
        {tonight ? (
          <p className="glow-pulse text-xs font-bold text-amber-300">Tonight</p>
        ) : (
          <>
            <p className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase">
              {dayOfWeek}
            </p>
            <p className="text-xs font-bold text-zinc-200">{restOfDate.join(" ")}</p>
          </>
        )}
        <p className={`mt-0.5 text-[10px] ${tonight ? "text-amber-200/80" : "text-zinc-500"}`}>
          {gig.time}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{gig.title}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {link === "venue" && venue && (
            <>
              <Link
                to={`/v/${venue.id}`}
                className="font-medium text-zinc-400 transition-colors hover:text-amber-300 hover:underline"
              >
                {venue.name}
              </Link>
              {" · "}
              {venue.neighborhood}
            </>
          )}
          {link === "band" &&
            (band ? (
              <Link
                to={`/b/${band.id}`}
                className="font-medium text-zinc-400 transition-colors hover:text-amber-300 hover:underline"
              >
                {band.name}
              </Link>
            ) : (
              <span>Open sign-up — all players welcome</span>
            ))}
        </p>
      </div>

      <span className="shrink-0 rounded-full border border-zinc-700/80 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300">
        {gig.ticket ?? "Free"}
      </span>
    </div>
  );
}
