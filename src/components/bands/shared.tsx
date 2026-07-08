// Shared pieces for the bands/venues surfaces: follow button, gig rows,
// and open-slot urgency helpers. Used by Bands, BandDetail, and VenueDetail.

import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Event } from "../../lib/types";
import { getBand, getVenue } from "../../lib/data";
import { useApp } from "../../lib/store";
import { Button } from "../ui";
import { CheckIcon, ChevronRightIcon, PlusIcon } from "../icons";

// ----------------------------------------------------------- slot urgency

/** open-slot notes that start with "URGENT" get the SOS treatment */
export function isUrgent(note: string): boolean {
  return /^urgent/i.test(note);
}

/** strip the leading "URGENT:" so the badge doesn't repeat the word */
export function slotNoteText(note: string): string {
  return note.replace(/^urgent:?\s*/i, "");
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
 * One upcoming gig as a row: date block (mono data layer), title, and a
 * cross-link — to the venue (on band pages) or to the band (on venue pages).
 */
export function GigRow({ gig, link }: { gig: Event; link: "venue" | "band" }) {
  const navigate = useNavigate();
  const venue = getVenue(gig.venueId);
  const band = gig.bandId ? getBand(gig.bandId) : undefined;
  const tonight = gig.date === "Tonight";
  const [dayOfWeek, ...restOfDate] = gig.date.split(" ");
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      onClick={() => navigate(`/e/${gig.id}`)}
      className="flex cursor-pointer items-center gap-3 p-3.5 transition-colors hover:bg-surface-800/40 sm:p-4"
    >
      <div
        className={`w-16 shrink-0 rounded-xl border px-1 py-2 text-center ${
          tonight
            ? "border-amber-500/40 bg-amber-500/10"
            : "border-hairline-subtle bg-surface-800"
        }`}
      >
        {tonight ? (
          <p className="mono blink text-[11px] font-bold text-amber-300">Tonight</p>
        ) : (
          <>
            <p className="mono text-[10px] font-semibold text-text-lo">{dayOfWeek}</p>
            <p className="mono text-xs font-bold text-text-hi">{restOfDate.join(" ")}</p>
          </>
        )}
        <p className={`mono mt-0.5 text-[10px] ${tonight ? "text-amber-200/80" : "text-text-lo"}`}>
          {gig.time}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{gig.title}</p>
        <p className="mt-0.5 truncate text-xs text-text-lo">
          {link === "venue" && venue && (
            <>
              <Link
                to={`/v/${venue.id}`}
                onClick={stop}
                className="font-medium text-text-mid transition-colors hover:text-amber-300 hover:underline"
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
                onClick={stop}
                className="font-medium text-text-mid transition-colors hover:text-amber-300 hover:underline"
              >
                {band.name}
              </Link>
            ) : (
              <span>Open sign-up — all players welcome</span>
            ))}
        </p>
      </div>

      <span className="mono shrink-0 rounded-full border border-hairline-strong bg-surface-900 px-2.5 py-1 text-xs font-medium text-text-hi">
        {gig.ticket ?? "Free"}
      </span>
      <ChevronRightIcon size={16} className="shrink-0 text-text-faint" />
    </div>
  );
}
