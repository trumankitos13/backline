// Rich result card for the Discover page. The whole card opens the profile;
// the video thumbnail opens the reel viewer and "Message" jumps to the thread.

import { useNavigate } from "react-router-dom";
import type { Musician, SkillLevel } from "../../lib/types";
import { instrument } from "../../lib/instruments";
import { Avatar, Button, Card, Chip } from "../ui";
import {
  ChatIcon,
  ClockIcon,
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
  musician: Musician;
  /** amber ring while SOS mode is on */
  highlight?: boolean;
  onOpenReel: (musician: Musician, clipIndex: number) => void;
}) {
  const navigate = useNavigate();
  const clip = m.videos[0];

  return (
    <Card
      onClick={() => navigate(`/m/${m.id}`)}
      className={`p-4 ${highlight ? "ring-1 ring-amber-400/30" : ""}`}
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Avatar name={m.name} seed={m.seed} size={46} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-zinc-100">{m.name}</span>
                {m.verified && <VerifiedIcon size={15} className="shrink-0" />}
              </p>
              {m.availableTonight ? (
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                  <span className="glow-pulse inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Free tonight
                </p>
              ) : (
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  Usually free {m.availability.join(" · ")}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {m.instruments.map((ins) => (
              <Chip key={ins.id}>
                <InstrumentIcon instrument={ins.id} size={13} />
                {instrument(ins.id).label}
                <span className="text-zinc-500">· {LEVEL_LABEL[ins.level]}</span>
              </Chip>
            ))}
          </div>

          <p className="mt-2 truncate text-xs text-zinc-400">{m.genres.join(" · ")}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <MapPinIcon size={13} className="text-zinc-500" />
              {m.neighborhood} · {m.distanceMiles} mi
            </span>
            <span className="font-medium text-zinc-200">
              ${m.rate.min}–{m.rate.max}
              <span className="font-normal text-zinc-500"> / gig</span>
            </span>
          </div>
        </div>

        {clip && (
          <div
            className="w-20 shrink-0 self-start"
            onClick={(e) => e.stopPropagation()}
          >
            <VideoTile
              clip={clip}
              className="w-full"
              showStats={false}
              onPlay={() => onOpenReel(m, 0)}
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-800/70 pt-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <ClockIcon size={13} className="text-zinc-500" />
            replies in ~{m.responseMins}m
          </span>
          <span>{m.gigsPlayed} gigs played</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/messages/c-${m.id}`);
          }}
        >
          <ChatIcon size={14} />
          Message
        </Button>
      </div>
    </Card>
  );
}
