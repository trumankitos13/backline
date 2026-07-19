// Rich result card for the Discover page. The whole card opens the profile;
// the reel thumbnail opens the viewer, "Message" jumps to the thread, and
// "Book" jumps to the thread with the booking sheet pre-opened.
//
// Backline: mono for every data atom (distance / rate / reply / gigs), cyan
// Verified, amber "free tonight", one amber Book CTA per card.

import { useNavigate } from "react-router-dom";
import type { Player, SkillLevel } from "../../lib/types";
import { instrument } from "../../lib/instruments";
import { useApp } from "../../lib/store";
import { ratingSummary } from "../../lib/ratings";
import {
  Avatar,
  Button,
  Card,
  Chip,
  FreeTonightBadge,
  Mono,
  RatingNumber,
  VerifiedBadge,
} from "../ui";
import {
  ChatIcon,
  ClockIcon,
  DollarIcon,
  InstrumentIcon,
  MapPinIcon,
  VerifiedIcon,
} from "../icons";
import { VideoTile } from "../video";

const LEVEL_LABEL: Record<SkillLevel, string> = {
  pro: "Pro",
  "semi-pro": "Semi-pro",
  hobbyist: "Hobbyist",
};

export function MusicianCard({
  musician: m,
  highlight = false,
  onOpenReel,
}: {
  musician: Player;
  /** amber ring while SOS mode is on */
  highlight?: boolean;
  onOpenReel: (musician: Player, clipIndex: number) => void;
}) {
  const navigate = useNavigate();
  const { state } = useApp();
  const rating = ratingSummary(m, state.ratingsGiven[m.id]);
  const clip = m.videos[0];

  return (
    <Card
      onClick={() => navigate(`/m/${m.id}`)}
      className={`p-4 ${highlight ? "ring-1 ring-amber-500/40" : ""}`}
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          {/* identity + rating */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={m.name} seed={m.seed} src={m.avatarUrl} size={44} />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5">
                  <span className="truncate font-semibold text-text-hi">{m.name}</span>
                  {m.verified && <VerifiedIcon size={14} className="shrink-0" />}
                </p>
                <Mono className="block truncate text-[10px] text-text-lo">
                  @{m.handle}
                </Mono>
              </div>
            </div>
            <RatingNumber avg={rating.avg} count={rating.count} size="sm" className="shrink-0" />
          </div>

          {/* status badges */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {m.verified && <VerifiedBadge />}
            {m.availableTonight ? (
              <FreeTonightBadge />
            ) : (
              <Mono className="text-[10px] text-text-lo">
                Free {m.availability.join(" · ")}
              </Mono>
            )}
          </div>

          {/* instruments */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {m.instruments.map((ins) => (
              <Chip key={ins.id}>
                <InstrumentIcon instrument={ins.id} size={13} />
                {instrument(ins.id).label}
                <span className="text-text-lo">· {LEVEL_LABEL[ins.level]}</span>
              </Chip>
            ))}
          </div>

          <p className="mt-2 truncate text-xs text-text-mid">{m.genres.join(" · ")}</p>

          {/* location + rate (data atoms → mono) */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-mid">
            <span className="inline-flex items-center gap-1">
              <MapPinIcon size={13} className="text-text-lo" />
              {m.neighborhood}
              <Mono className="text-[11px] text-text-mid">· {m.distanceMiles} MI</Mono>
            </span>
            <Mono className="text-[11px] text-text-hi">
              ${m.rate.min}–{m.rate.max}
              <span className="text-text-lo"> /GIG</span>
            </Mono>
          </div>
        </div>

        {clip && (
          <div className="w-16 shrink-0 self-start sm:w-20" onClick={(e) => e.stopPropagation()}>
            <VideoTile
              clip={clip}
              className="w-full"
              showStats={false}
              onPlay={() => onOpenReel(m, 0)}
            />
          </div>
        )}
      </div>

      {/* stats + actions */}
      <div className="mt-3 border-t border-hairline-subtle pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-text-lo">
          <span className="mono inline-flex items-center gap-1 text-[11px]">
            <ClockIcon size={12} className="text-text-lo" />~{m.responseMins} MIN REPLY
          </span>
          <Mono className="text-[11px]">{m.gigsPlayed} EVENTS</Mono>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/messages/c-${m.id}`);
            }}
          >
            <ChatIcon size={15} />
            Message
          </Button>
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/messages/c-${m.id}`, { state: { openBooking: true } });
            }}
          >
            <DollarIcon size={15} />
            Book
          </Button>
        </div>
      </div>
    </Card>
  );
}
