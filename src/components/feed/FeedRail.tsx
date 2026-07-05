// Side-rail modules for the feed page: follow suggestions + tonight's gigs.
// Rendered in the right column at lg+, inline below the feed on mobile.

import { useState } from "react";
import { Link } from "react-router-dom";
import { BANDS, GIGS, VENUES, getVenue } from "../../lib/data";
import { useApp } from "../../lib/store";
import { Avatar, Button, Card, SectionHeader, formatCount } from "../ui";
import { CheckIcon } from "../icons";

// ---------------------------------------------------------- who to follow

interface Suggestion {
  id: string;
  name: string;
  seed: number;
  href: string;
  meta: string;
}

export function WhoToFollow() {
  const { state, api } = useApp();

  // snapshot on mount so rows don't vanish the instant you follow them —
  // the button flips to "Following" instead (and is still un-toggleable)
  const [suggestions] = useState<Suggestion[]>(() => {
    const venues: Suggestion[] = VENUES.filter((v) => !state.following.includes(v.id)).map(
      (v) => ({
        id: v.id,
        name: v.name,
        seed: v.seed,
        href: `/v/${v.id}`,
        meta: `Venue · ${formatCount(v.followers)} followers`,
      }),
    );
    const bands: Suggestion[] = BANDS.filter((b) => !state.following.includes(b.id)).map(
      (b) => ({
        id: b.id,
        name: b.name,
        seed: b.seed,
        href: `/b/${b.id}`,
        meta: `${b.genres[0] ?? "Band"} · ${formatCount(b.followers)} followers`,
      }),
    );
    // interleave venues and bands for variety
    const merged: Suggestion[] = [];
    const max = Math.max(venues.length, bands.length);
    for (let i = 0; i < max && merged.length < 4; i++) {
      const v = venues[i];
      if (v) merged.push(v);
      const b = bands[i];
      if (b && merged.length < 4) merged.push(b);
    }
    return merged;
  });

  if (suggestions.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Who to follow" className="mb-2.5" />
      <Card className="divide-y divide-zinc-800/60 px-3">
        {suggestions.map((s) => {
          const following = state.following.includes(s.id);
          return (
            <div key={s.id} className="flex items-center gap-2.5 py-2.5">
              <Link to={s.href} className="shrink-0 transition-opacity hover:opacity-85">
                <Avatar name={s.name} seed={s.seed} size={34} square />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to={s.href}
                  className="block truncate text-sm font-medium hover:text-amber-300"
                >
                  {s.name}
                </Link>
                <p className="truncate text-[11px] text-zinc-500">{s.meta}</p>
              </div>
              <Button
                size="sm"
                variant={following ? "ghost" : "secondary"}
                onClick={() => api.toggleFollow(s.id)}
                aria-pressed={following}
              >
                {following && <CheckIcon size={13} className="text-emerald-400" />}
                {following ? "Following" : "Follow"}
              </Button>
            </div>
          );
        })}
      </Card>
    </section>
  );
}

// -------------------------------------------------------- tonight in town

export function TonightInTown() {
  const tonight = GIGS.filter((g) => g.date === "Tonight");
  if (tonight.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Tonight in town" className="mb-2.5" />
      <Card className="divide-y divide-zinc-800/60 px-3">
        {tonight.map((g) => {
          const venue = getVenue(g.venueId);
          return (
            <div key={g.id} className="flex items-start gap-2.5 py-2.5">
              <span className="glow-pulse mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug font-medium">{g.title}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {g.time}
                  {venue && (
                    <>
                      {" · "}
                      <Link
                        to={`/v/${venue.id}`}
                        className="text-zinc-400 hover:text-amber-300 hover:underline"
                      >
                        {venue.name}
                      </Link>
                    </>
                  )}
                  {g.ticket && <> · {g.ticket}</>}
                </p>
              </div>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
