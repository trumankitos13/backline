// A single feed post: author row, kind pill, kind-specific attachment, footer.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { FeedPost, Event, PostKind, VideoClip } from "../../lib/types";
import { getEvent, getBand, getPlayer, getVenue } from "../../lib/data";
import { instrumentLabel } from "../../lib/instruments";
import { useApp } from "../../lib/store";
import { Avatar, Badge, Button, Card, Mono, UrgentBadge, formatCount } from "../ui";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CommentIcon,
  HeartIcon,
  InstrumentIcon,
  ShareIcon,
  VerifiedIcon,
} from "../icons";
import { ReelViewer, VideoTile } from "../video";

// ---------------------------------------------------------------- author

interface AuthorInfo {
  name: string;
  seed: number;
  href: string;
  typeLabel: string;
  square: boolean;
  verified?: boolean;
}

function resolveAuthor(post: FeedPost): AuthorInfo | null {
  const { type, id } = post.author;
  if (type === "band") {
    const b = getBand(id);
    return b
      ? { name: b.name, seed: b.seed, href: `/b/${b.id}`, typeLabel: "Band", square: true }
      : null;
  }
  if (type === "venue") {
    const v = getVenue(id);
    return v
      ? { name: v.name, seed: v.seed, href: `/v/${v.id}`, typeLabel: "Venue", square: true }
      : null;
  }
  const m = getPlayer(id);
  return m
    ? {
        name: m.name,
        seed: m.seed,
        href: `/m/${m.id}`,
        typeLabel: "Player",
        square: false,
        verified: m.verified,
      }
    : null;
}

// ------------------------------------------------------------- kind pill

type PillTone = "neutral" | "amber" | "cyan";

const KIND_PILL: Record<PostKind, { label: string; tone: PillTone }> = {
  gig: { label: "Event", tone: "neutral" },
  "open-mic": { label: "Open mic", tone: "neutral" },
  "need-sub": { label: "Sub needed", tone: "amber" },
  video: { label: "Reel", tone: "neutral" },
  news: { label: "News", tone: "neutral" },
};

// ------------------------------------------------------------- gig embed

function GigEmbed({ gig }: { gig: Event }) {
  const venue = getVenue(gig.venueId);
  const [interested, setInterested] = useState(false);
  return (
    <Card className="mt-3 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-800 text-amber-300">
          <CalendarIcon size={18} />
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <Link
            to={`/e/${gig.id}`}
            className="block truncate text-sm font-medium text-text-hi transition-colors hover:text-amber-300"
          >
            {gig.title}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-mid">
            <Mono className="text-[11px] text-text-mid">
              {gig.date} · {gig.time}
            </Mono>
            {venue && (
              <>
                <span className="text-text-faint">·</span>
                <Link
                  to={`/v/${venue.id}`}
                  className="font-medium text-text-mid hover:text-amber-300 hover:underline"
                >
                  {venue.name}
                </Link>
              </>
            )}
            <span className="text-text-faint">·</span>
            <Mono className="text-[11px] text-text-mid">{gig.ticket ?? "Free"}</Mono>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={interested}
          onClick={() => setInterested((v) => !v)}
        >
          {interested && <CheckIcon size={14} className="text-cyan-300" />}
          Interested
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------- need-sub embed

function SubEmbed({
  post,
  sub,
  authorName,
}: {
  post: FeedPost;
  sub: NonNullable<FeedPost["subFor"]>;
  authorName: string;
}) {
  const { state, api } = useApp();
  const navigate = useNavigate();
  const responded = state.respondedSubPosts.includes(post.id);
  return (
    <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-3.5 shadow-[0_0_28px_-10px_rgba(255,138,61,0.5)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
          <InstrumentIcon instrument={sub.instrument} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-amber-300">
              Need: {instrumentLabel(sub.instrument)}
            </p>
            <span className="ml-auto shrink-0">
              <UrgentBadge />
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Mono className="inline-flex items-center gap-1 text-[11px] text-text-mid">
              <ClockIcon size={12} className="text-text-lo" />
              {sub.date}
            </Mono>
            <span className="text-text-faint">·</span>
            <Mono className="text-[11px] font-bold text-amber-300">
              ${sub.payout} guaranteed
            </Mono>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {responded ? (
          <button
            disabled
            className="inline-flex min-h-[44px] cursor-default items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-300"
          >
            You raised your hand <CheckIcon size={14} />
          </button>
        ) : (
          <Button size="sm" onClick={() => api.respondToSubPost(post.id, authorName)}>
            I'm available →
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => navigate("/")}>
          Find subs
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ video embed

function VideoEmbed({ clip, ownerId }: { clip: VideoClip; ownerId?: string }) {
  const [open, setOpen] = useState(false);
  const owner = ownerId ? getPlayer(ownerId) : undefined;
  // open the owner's full reel starting at this clip when we can
  const clips =
    owner && owner.videos.some((v) => v.id === clip.id) ? owner.videos : [clip];
  const startIndex = Math.max(0, clips.findIndex((v) => v.id === clip.id));
  return (
    <div className="mt-3">
      <VideoTile clip={clip} className="w-40" onPlay={() => setOpen(true)} />
      {open && (
        <ReelViewer
          clips={clips}
          startIndex={startIndex}
          ownerName={owner?.name}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------ footer row

function PostFooter({ post }: { post: FeedPost }) {
  const { state, api } = useApp();
  const liked = state.likedPosts.includes(post.id);
  return (
    <div className="mt-3 flex items-center gap-6 border-t border-hairline-subtle pt-2.5 text-text-lo">
      <button
        onClick={() => api.toggleLike(post.id)}
        aria-pressed={liked}
        aria-label={liked ? "Unlike" : "Like"}
        className={`flex items-center gap-1.5 transition-colors ${
          liked ? "text-[var(--color-danger)]" : "hover:text-[var(--color-danger)]"
        }`}
      >
        <HeartIcon size={17} filled={liked} />
        <Mono className={`text-[11px] transition-transform ${liked ? "scale-110" : ""}`}>
          {formatCount(post.likes + (liked ? 1 : 0))}
        </Mono>
      </button>
      <button
        aria-label="Comments"
        className="flex items-center gap-1.5 transition-colors hover:text-text-hi"
      >
        <CommentIcon size={17} />
        <Mono className="text-[11px]">{formatCount(post.comments)}</Mono>
      </button>
      <button
        aria-label="Share"
        className="ml-auto flex items-center gap-1.5 transition-colors hover:text-text-hi"
      >
        <ShareIcon size={17} />
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ card

export function PostCard({ post }: { post: FeedPost }) {
  const author = resolveAuthor(post);
  if (!author) return null;
  const gig = post.eventId ? getEvent(post.eventId) : undefined;
  const pill = KIND_PILL[post.kind];

  return (
    <Card className="p-4">
      {/* author row */}
      <div className="flex items-center gap-3">
        <Link to={author.href} className="shrink-0 transition-opacity hover:opacity-85">
          <Avatar name={author.name} seed={author.seed} size={42} square={author.square} />
        </Link>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Link to={author.href} className="truncate hover:text-amber-300 hover:underline">
              {author.name}
            </Link>
            {author.verified && <VerifiedIcon size={14} className="shrink-0" />}
          </p>
          <Mono className="text-[11px] text-text-lo">
            {author.typeLabel} · {post.ago}
          </Mono>
        </div>
      </div>

      {/* body */}
      <p className="mt-3 text-sm leading-relaxed text-text-hi">{post.text}</p>

      {/* kind pill */}
      <div className="mt-3">
        <Badge tone={pill.tone}>{pill.label}</Badge>
      </div>

      {/* kind-specific attachment */}
      {(post.kind === "gig" || post.kind === "open-mic") && gig && <GigEmbed gig={gig} />}
      {post.kind === "need-sub" && post.subFor && (
        <SubEmbed post={post} sub={post.subFor} authorName={author.name} />
      )}
      {post.kind === "video" && post.video && (
        <VideoEmbed clip={post.video} ownerId={post.videoOwnerId} />
      )}

      <PostFooter post={post} />
    </Card>
  );
}
