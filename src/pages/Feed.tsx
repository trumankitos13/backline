// /feed — the scene pulse: posts from venues, bands, and musicians you follow.
// Openings the user posts (PostFlow) surface here first, attributed to the
// acting-as context, with the fee kept private (it lives in the DM offer).

import { useMemo, useState } from "react";
import { Page } from "../components/shell";
import { Button, EmptyState, Mono } from "../components/ui";
import { PulseIcon } from "../components/icons";
import { FEED_POSTS } from "../lib/data";
import { instrumentLabel } from "../lib/instruments";
import type { FeedPost, Opening } from "../lib/types";
import { useApp } from "../lib/store";
import { PostCard } from "../components/feed/PostCard";
import { TonightInTown, WhoToFollow } from "../components/feed/FeedRail";

/** a posted Opening rendered through the existing need-sub card. */
function openingToPost(op: Opening): FeedPost {
  return {
    id: `p-${op.id}`,
    kind: "need-sub",
    author:
      op.postedBy.kind === "player"
        ? { type: "player", id: "me" }
        : { type: op.postedBy.kind, id: op.postedBy.id },
    text:
      op.note ??
      `Looking for ${instrumentLabel(op.instrument).toLowerCase()} — ${op.when.toLowerCase()}. DM to talk details.`,
    ago: op.ago ?? "just now",
    likes: 0,
    comments: 0,
    eventId: op.eventId,
    subFor: { instrument: op.instrument, date: op.when, urgent: op.urgent ?? false },
    own: true,
  };
}

type Tab = "following" | "everyone";

const TABS: { id: Tab; label: string }[] = [
  { id: "following", label: "Following" },
  { id: "everyone", label: "Everyone" },
];

export default function Feed() {
  const { state } = useApp();
  const [tab, setTab] = useState<Tab>("following");

  // your posted openings lead the feed on both tabs (they're yours)
  const openingPosts = useMemo(
    () => state.openings.map(openingToPost),
    [state.openings],
  );

  // players are treated as always-followed; bands/venues gate on follows
  const catalogPosts =
    tab === "everyone"
      ? FEED_POSTS
      : FEED_POSTS.filter(
          (p) => p.author.type === "player" || state.following.includes(p.author.id),
        );
  const posts = [...openingPosts, ...catalogPosts];

  return (
    <Page wide title="Your scene" subtitle={<Mono className="text-text-lo">Austin, TX</Mono>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
        {/* main column */}
        <div className="min-w-0">
          {/* segmented control */}
          <div
            role="tablist"
            aria-label="Feed filter"
            className="mb-4 flex rounded-xl border border-hairline-subtle bg-surface-900 p-1 sm:inline-flex"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                  tab === t.id
                    ? "bg-surface-800 text-amber-300"
                    : "text-text-mid hover:text-text-hi"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* nudge when every band/venue has been unfollowed but musician
              posts keep the feed alive */}
          {tab === "following" && state.following.length === 0 && posts.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-hairline-subtle bg-surface-900 px-4 py-3">
              <p className="text-sm text-text-mid">
                You're not following any venues or bands — only musician reels land here.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setTab("everyone")}>
                See Everyone →
              </Button>
            </div>
          )}

          {/* Tonight module stays on mobile (the rail is lg+ only) */}
          <div className="mb-4 lg:hidden">
            <TonightInTown />
          </div>

          {posts.length === 0 ? (
            <EmptyState
              icon={<PulseIcon size={30} />}
              title="Your feed is quiet"
              body="Follow a few venues and bands to get the scene pulse — or flip over to Everyone to see what all of Austin is up to."
              action={
                <Button variant="secondary" size="sm" onClick={() => setTab("everyone")}>
                  Browse Everyone
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
              <Mono className="py-2 text-center text-[10px] text-text-faint">
                You're all caught up — go play something.
              </Mono>
            </div>
          )}
        </div>

        {/* side rail: right column at lg+ only */}
        <div className="hidden min-w-0 space-y-6 lg:sticky lg:top-5 lg:block">
          <WhoToFollow />
          <TonightInTown />
        </div>
      </div>
    </Page>
  );
}
