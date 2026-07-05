// A single feed post: author row, text, kind-specific attachment, action footer.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { FeedPost, Gig, VideoClip } from "../../lib/types";
import { getGig, getBand, getMusician, getVenue } from "../../lib/data";
import { instrumentLabel } from "../../lib/instruments";
import { useApp } from "../../lib/store";
import { Avatar, Button, Card, formatCount } from "../ui";
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
  const m = getMusician(id);
  return m
    ? {
        name: m.name,
        seed: m.seed,
        href: `/m/${m.id}`,
        typeLabel: "Musician",
        square: false,
        verified: m.verified,
      }
    : null;
}

// ------------------------------------------------------------- gig embed

function GigEmbed({ gig }: { gig: Gig }) {
  const venue = getVenue(gig.venueId);
  const [interested, setInterested] = useState(false);
  return (
    <Card className="mt-3 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 text-amber-300">
          <CalendarIcon size={18} />
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate text-sm font-medium text-zinc-100">{gig.title}</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {gig.date} · {gig.time}
            {venue && (
              <>
                {" · "}
                <Link
                  to={`/v/${venue.id}`}
                  className="font-medium text-zinc-300 hover:text-amber-300 hover:underline"
                >
                  {venue.name}
                </Link>
              </>
            )}
            {" · "}
            {gig.ticket ?? "Free"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={interested}
          onClick={() => setInterested((v) => !v)}
        >
          {interested && <CheckIcon size={14} className="text-amber-400" />}
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
    <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/[0.06] p-3.5 shadow-[0_0_28px_-10px_rgba(251,191,36,0.5)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
          <InstrumentIcon instrument={sub.instrument} size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-300">
            Need: {instrumentLabel(sub.instrument)}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-300">
            <span className="inline-flex items-center gap-1">
              <ClockIcon size={13} className="text-zinc-400" />
              {sub.date}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="font-semibold text-emerald-300">${sub.payout} guaranteed</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {responded ? (
          <Button size="sm" variant="secondary" disabled>
            You raised your hand <CheckIcon size={14} className="text-emerald-400" />
          </Button>
        ) : (
          <Button size="sm" onClick={() => api.respondToSubPost(post.id, authorName)}>
            I'm available →
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => navigate("/")}>
          Find subs
        </Button>
        {responded && (
          <span className="text-xs text-zinc-400">{authorName} got your info.</span>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ video embed

function VideoEmbed({ clip, ownerId }: { clip: VideoClip; ownerId?: string }) {
  const [open, setOpen] = useState(false);
  const owner = ownerId ? getMusician(ownerId) : undefined;
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
    <div className="mt-3 flex items-center gap-6 border-t border-zinc-800/60 pt-2.5 text-zinc-500">
      <button
        onClick={() => api.toggleLike(post.id)}
        aria-pressed={liked}
        aria-label={liked ? "Unlike" : "Like"}
        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
          liked ? "text-red-400" : "hover:text-red-300"
        }`}
      >
        <HeartIcon size={17} filled={liked} />
        {formatCount(post.likes + (liked ? 1 : 0))}
      </button>
      <button
        aria-label="Comments"
        className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-zinc-300"
      >
        <CommentIcon size={17} />
        {formatCount(post.comments)}
      </button>
      <button
        aria-label="Share"
        className="ml-auto flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-zinc-300"
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
  const gig = post.gigId ? getGig(post.gigId) : undefined;

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
          <p className="text-xs text-zinc-500">
            {author.typeLabel} · {post.ago}
          </p>
        </div>
      </div>

      {/* body */}
      <p className="mt-3 text-sm leading-relaxed text-zinc-200">{post.text}</p>

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
