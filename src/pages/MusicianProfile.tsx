// Player profile (/m/:id): Uber-style headline rating, reels showcase, stats,
// gear, availability, bands, a ratings breakdown + written reviews, and a sticky
// Message / Book CTA bar that drops into the chat thread.

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Page } from "../components/shell";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  FreeTonightBadge,
  Mono,
  RatingBreakdown,
  RatingNumber,
  SectionHeader,
  Stars,
  VerifiedBadge,
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
} from "../components/icons";
import { EmbeddedReelViewer, ReelTile, ReelViewer, VideoTile } from "../components/video";
import { LinksSection } from "../components/links";
import { getBand, getPlayer } from "../lib/data";
import { ratingSummary } from "../lib/ratings";
import { useApp } from "../lib/store";
import type { Band } from "../lib/types";
import {
  AvailabilityDays,
  InstrumentChips,
} from "../components/profile/shared";

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-1 py-3.5 text-center">
      <Mono className="text-sm font-bold text-text-hi sm:text-base">{value}</Mono>
      <Mono className="text-[9px] text-text-lo">{label}</Mono>
    </div>
  );
}

export default function MusicianProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const [reelAt, setReelAt] = useState<number | null>(null);
  const [fallbackAt, setFallbackAt] = useState<number | null>(null);

  const m = id ? getPlayer(id) : undefined;

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
  const summary = ratingSummary(m, state.ratingsGiven[m.id]);
  const totalPlays = m.videos.reduce((sum, v) => sum + v.plays, 0);
  const realReels = m.reels ?? [];
  const isOwnProfile = state.user?.id === m.id;
  const bands = m.bandIds
    .map((bid) => getBand(bid))
    .filter((b): b is Band => Boolean(b));

  return (
    <Page>
      {/* extra bottom padding so the sticky CTA bar never covers content */}
      <div className="pb-44 md:pb-28">
        <button
          onClick={() => navigate(-1)}
          className="-ml-1 mb-4 flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-text-mid transition-colors hover:text-text-hi"
        >
          <ArrowLeftIcon size={17} />
          Back
        </button>

        {/* ------------------------------------------------------- header */}
        <header>
          <div className="flex items-start gap-4">
            <Avatar name={m.name} seed={m.seed} src={m.avatarUrl} size={88} className="ring-2 ring-hairline-strong" />
            <div className="min-w-0 pt-1">
              <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-bold tracking-tight">
                <span className="truncate">{m.name}</span>
                {m.verified && <VerifiedBadge />}
              </h1>
              <Mono className="mt-0.5 block text-xs text-text-lo">@{m.handle}</Mono>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-text-mid">
                <MapPinIcon size={15} className="shrink-0 text-text-lo" />
                <span>{m.neighborhood}</span>
                <Mono className="text-[11px] text-text-lo">· {m.distanceMiles} MI AWAY</Mono>
              </p>
              {m.availableTonight && <FreeTonightBadge className="mt-2.5" />}
            </div>
          </div>
          <InstrumentChips instruments={m.instruments} className="mt-4" />
          <div className="mt-2 flex flex-wrap gap-2">
            {m.genres.map((g) => (
              <Chip key={g}>{g}</Chip>
            ))}
          </div>
        </header>

        {/* ---------------------------------- hero rating (Uber-style) + stats */}
        <Card className="mt-5 overflow-hidden">
          <div className="flex items-center gap-4 border-b border-hairline-subtle p-4">
            <div className="min-w-0">
              <RatingNumber avg={summary.avg} count={summary.count} size="lg" />
              <Mono className="mt-1.5 block text-[10px] text-text-lo">
                Rating · {summary.count} gigs rated
              </Mono>
            </div>
            <div className="ml-auto text-right">
              <Stars rating={summary.avg} size={16} />
              <Mono className="mt-1.5 block text-[10px] text-text-lo">
                Trusted sub
              </Mono>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-hairline-subtle">
            <StatCell value={String(m.gigsPlayed)} label="gigs" />
            <StatCell value={`~${m.responseMins}m`} label="reply" />
            <StatCell value={`$${m.rate.min}–${m.rate.max}`} label="per gig" />
          </div>
        </Card>

        {/* --------------------------------------------------------- reels */}
        <section className="mt-8">
          <SectionHeader
            title="Reels"
            className="mb-3"
            action={
              realReels.length > 0 ? (
                <Mono className="flex items-center gap-1 text-[10px] text-text-lo">
                  <PlayIcon size={11} />
                  {realReels.length} featured
                </Mono>
              ) : m.videos.length > 0 ? (
                <Mono className="flex items-center gap-1 text-[10px] text-text-lo">
                  <PlayIcon size={11} />
                  {formatCount(totalPlays)} plays
                </Mono>
              ) : undefined
            }
          />
          {realReels.length > 0 ? (
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
              {realReels.map((reel, index) => (
                <ReelTile
                  key={reel.id}
                  reel={reel}
                  onPlay={() => setReelAt(index)}
                  className="w-32 sm:w-36"
                />
              ))}
            </div>
          ) : m.videos.length > 0 ? (
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
              {m.videos.map((clip, i) => (
                <VideoTile
                  key={clip.id}
                  clip={clip}
                  onPlay={() => setFallbackAt(i)}
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
          <p className="text-sm leading-relaxed text-text-mid">{m.bio}</p>
          <Card className="mt-4 p-4">
            <Mono className="mb-2.5 block text-[10px] text-text-lo">Gear</Mono>
            <div className="flex flex-wrap gap-2">
              {m.gear.map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-hairline-subtle bg-surface-800 px-2.5 py-1 text-xs text-text-mid"
                >
                  <span className="h-1 w-1 shrink-0 rounded-full bg-amber-500/80" />
                  {g}
                </span>
              ))}
            </div>
          </Card>
          <Card className="mt-3 p-4">
            <Mono className="mb-2.5 block text-[10px] text-text-lo">Usually free on</Mono>
            <AvailabilityDays days={m.availability} />
          </Card>
        </section>

        {/* --------------------------------------------------------- bands */}
        {bands.length > 0 && (
          <section className="mt-8">
            <SectionHeader title="Bands" className="mb-3" />
            <div className="flex flex-col gap-2.5">
              {bands.map((b) => {
                const role = b.members.find((mem) => mem.playerId === m.id)?.role;
                return (
                  <Link key={b.id} to={`/b/${b.id}`}>
                    <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-hairline-strong hover:bg-surface-850">
                      <Avatar name={b.name} seed={b.seed} size={46} square />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text-hi">{b.name}</p>
                        <p className="truncate text-xs text-text-lo">
                          {role && <span className="text-amber-300">{role}</span>}
                          {role && " · "}
                          {b.genres.join(" · ")}
                        </p>
                      </div>
                      <ChevronRightIcon size={17} className="shrink-0 text-text-faint" />
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ----------------------------------------- ratings breakdown + reviews */}
        <section className="mt-8">
          <SectionHeader
            title={`${summary.count} ratings`}
            className="mb-3"
            action={<RatingNumber avg={summary.avg} count={0} size="sm" />}
          />
          <Card className="flex items-center gap-5 p-4">
            <div className="flex shrink-0 flex-col items-center gap-1 pr-5">
              <span className="text-4xl font-bold tracking-tight text-text-hi">
                {summary.avg.toFixed(1)}
              </span>
              <Stars rating={summary.avg} size={13} />
              <Mono className="mt-0.5 text-[9px] text-text-lo">{summary.count} total</Mono>
            </div>
            <RatingBreakdown breakdown={summary.breakdown} className="flex-1" />
          </Card>
        </section>

        {/* ------------------------------------------------------- reviews */}
        <section className="mt-6">
          <SectionHeader title="Reviews" className="mb-3" />
          {m.reviews.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {m.reviews.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={r.rating} size={13} />
                    <Mono className="text-[10px] text-text-faint">{r.date}</Mono>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-text-mid">“{r.text}”</p>
                  <p className="mt-2.5 text-xs text-text-lo">
                    <span className="font-medium text-text-mid">{r.author}</span> · {r.role}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4 text-sm leading-relaxed text-text-lo">
              No written reviews yet — book {firstName} and be the first to say how the gig went.
            </Card>
          )}
        </section>

        <LinksSection links={m.links} title={`Find ${firstName} online`} className="mt-6" />
      </div>

      {/* -------------------------------------------------- sticky CTA bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 md:bottom-6">
        <div className="mx-auto max-w-6xl md:pl-56">
          <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
            <div className="pointer-events-auto flex gap-3 rounded-2xl border border-hairline bg-surface-900/90 p-3 shadow-2xl shadow-black/60 backdrop-blur-md">
              {isOwnProfile ? (
                <Button className="flex-1" onClick={() => navigate("/profile")}>
                  Edit your profile
                </Button>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {reelAt !== null && realReels.length > 0 && (
        <EmbeddedReelViewer
          reels={realReels}
          startIndex={reelAt}
          ownerName={m.name}
          onClose={() => setReelAt(null)}
        />
      )}
      {fallbackAt !== null && (
        <ReelViewer
          clips={m.videos}
          startIndex={fallbackAt}
          ownerName={m.name}
          onClose={() => setFallbackAt(null)}
        />
      )}
    </Page>
  );
}
