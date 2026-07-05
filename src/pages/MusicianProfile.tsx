// Musician profile (/m/:id): reels showcase, stats, gear, bands, reviews,
// and a sticky Message / Book CTA bar that drops into the chat thread.

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Page } from "../components/shell";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  SectionHeader,
  Stars,
  formatCount,
} from "../components/ui";
import {
  ArrowLeftIcon,
  BoltIcon,
  ChatIcon,
  ChevronRightIcon,
  MapPinIcon,
  MusicNoteIcon,
  PlayIcon,
  StarIcon,
  VerifiedIcon,
} from "../components/icons";
import { ReelViewer, VideoTile } from "../components/video";
import { getBand, getMusician } from "../lib/data";
import type { Band } from "../lib/types";
import {
  AvailabilityDays,
  FreeTonightBadge,
  InstrumentChips,
} from "../components/profile/shared";

function StatCell({
  value,
  label,
  star = false,
}: {
  value: string;
  label: string;
  star?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 py-3.5 text-center">
      <span className="flex items-center gap-1 text-sm font-bold sm:text-base">
        {value}
        {star && <StarIcon size={12} className="text-amber-400" />}
      </span>
      <span className="text-[10px] tracking-wide text-zinc-500 uppercase">{label}</span>
    </div>
  );
}

export default function MusicianProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reelAt, setReelAt] = useState<number | null>(null);

  const m = id ? getMusician(id) : undefined;

  if (!m) {
    return (
      <Page>
        <EmptyState
          icon={<MusicNoteIcon size={34} />}
          title="This musician has left the stage"
          body="We couldn't find that profile — the link may be old, or they've packed up their gear. Plenty of great players are still around."
          action={<Button onClick={() => navigate("/")}>Browse players</Button>}
        />
      </Page>
    );
  }

  const firstName = m.name.split(" ")[0];
  const rating = m.reviews.length
    ? m.reviews.reduce((sum, r) => sum + r.rating, 0) / m.reviews.length
    : null;
  const totalPlays = m.videos.reduce((sum, v) => sum + v.plays, 0);
  const bands = m.bandIds
    .map((bid) => getBand(bid))
    .filter((b): b is Band => Boolean(b));

  return (
    <Page>
      {/* extra bottom padding so the sticky CTA bar never covers content */}
      <div className="pb-24">
        <button
          onClick={() => navigate(-1)}
          className="-ml-1 mb-4 flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <ArrowLeftIcon size={17} />
          Back
        </button>

        {/* ------------------------------------------------------- header */}
        <header>
          <div className="flex items-start gap-4">
            <Avatar name={m.name} seed={m.seed} size={88} className="ring-2 ring-zinc-800" />
            <div className="min-w-0 pt-1">
              <h1 className="flex items-center gap-1.5 text-2xl font-bold tracking-tight">
                <span className="truncate">{m.name}</span>
                {m.verified && <VerifiedIcon size={20} className="shrink-0" />}
              </h1>
              <p className="text-sm text-zinc-500">@{m.handle}</p>
              <p className="mt-1.5 flex items-center gap-1 text-sm text-zinc-400">
                <MapPinIcon size={15} className="shrink-0 text-zinc-500" />
                {m.neighborhood} · {m.distanceMiles} mi away
              </p>
              {m.availableTonight && <FreeTonightBadge className="mt-2" />}
            </div>
          </div>
          <InstrumentChips instruments={m.instruments} className="mt-4" />
          <div className="mt-2 flex flex-wrap gap-2">
            {m.genres.map((g) => (
              <Chip key={g}>{g}</Chip>
            ))}
          </div>
        </header>

        {/* ------------------------------------------------------ stat row */}
        <Card className="mt-5 grid grid-cols-4 divide-x divide-zinc-800/80">
          <StatCell value={String(m.gigsPlayed)} label="gigs played" />
          <StatCell value={`~${m.responseMins}m`} label="reply time" />
          <StatCell value={`$${m.rate.min}–${m.rate.max}`} label="per gig" />
          <StatCell
            value={rating ? rating.toFixed(1) : "New"}
            label={
              rating
                ? `${m.reviews.length} review${m.reviews.length === 1 ? "" : "s"}`
                : "no reviews"
            }
            star={Boolean(rating)}
          />
        </Card>

        {/* --------------------------------------------------------- reels */}
        <section className="mt-8">
          <SectionHeader
            title="Reels"
            className="mb-3"
            action={
              m.videos.length > 0 ? (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <PlayIcon size={12} />
                  {formatCount(totalPlays)} total plays
                </span>
              ) : undefined
            }
          />
          {m.videos.length > 0 ? (
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
              {m.videos.map((clip, i) => (
                <VideoTile
                  key={clip.id}
                  clip={clip}
                  onPlay={() => setReelAt(i)}
                  className="w-32 sm:w-36"
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<PlayIcon size={28} />}
              title="No reels yet"
              body={`${firstName} hasn't posted any clips — ask for a link to recent live footage.`}
            />
          )}
        </section>

        {/* --------------------------------------------------------- about */}
        <section className="mt-8">
          <SectionHeader title="About" className="mb-3" />
          <p className="text-sm leading-relaxed text-zinc-300">{m.bio}</p>
          <Card className="mt-4 p-4">
            <p className="mb-2.5 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Gear
            </p>
            <div className="flex flex-wrap gap-2">
              {m.gear.map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300"
                >
                  <span className="h-1 w-1 shrink-0 rounded-full bg-amber-400/80" />
                  {g}
                </span>
              ))}
            </div>
          </Card>
          <Card className="mt-3 p-4">
            <p className="mb-2.5 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Usually free on
            </p>
            <AvailabilityDays days={m.availability} />
          </Card>
        </section>

        {/* --------------------------------------------------------- bands */}
        {bands.length > 0 && (
          <section className="mt-8">
            <SectionHeader title="Bands" className="mb-3" />
            <div className="flex flex-col gap-2.5">
              {bands.map((b) => {
                const role = b.members.find((mem) => mem.musicianId === m.id)?.role;
                return (
                  <Link key={b.id} to={`/b/${b.id}`}>
                    <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
                      <Avatar name={b.name} seed={b.seed} size={46} square />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{b.name}</p>
                        <p className="truncate text-xs text-zinc-500">
                          {role && <span className="text-amber-300/90">{role}</span>}
                          {role && " · "}
                          {b.genres.join(" · ")}
                        </p>
                      </div>
                      <ChevronRightIcon size={17} className="shrink-0 text-zinc-600" />
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ------------------------------------------------------- reviews */}
        <section className="mt-8">
          <SectionHeader
            title="Reviews"
            className="mb-3"
            action={
              rating ? (
                <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Stars rating={rating} size={12} />
                  {rating.toFixed(1)}
                </span>
              ) : undefined
            }
          />
          {m.reviews.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {m.reviews.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={r.rating} size={13} />
                    <span className="text-xs text-zinc-600">{r.date}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">“{r.text}”</p>
                  <p className="mt-2.5 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-400">{r.author}</span> · {r.role}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4 text-sm leading-relaxed text-zinc-500">
              No reviews yet — book {firstName} and be the first to say how the gig went.
            </Card>
          )}
        </section>
      </div>

      {/* -------------------------------------------------- sticky CTA bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-16 z-30 md:bottom-6">
        <div className="mx-auto max-w-6xl md:pl-56">
          <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
            <div className="pointer-events-auto flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-3 shadow-2xl shadow-black/60 backdrop-blur-md">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => navigate(`/messages/c-${m.id}`)}
              >
                <ChatIcon size={17} />
                Message
              </Button>
              <Button
                className="flex-1"
                onClick={() =>
                  navigate(`/messages/c-${m.id}`, { state: { openBooking: true } })
                }
              >
                <BoltIcon size={17} />
                Book for a gig
              </Button>
            </div>
          </div>
        </div>
      </div>

      {reelAt !== null && (
        <ReelViewer
          clips={m.videos}
          startIndex={reelAt}
          ownerName={m.name}
          onClose={() => setReelAt(null)}
        />
      )}
    </Page>
  );
}
