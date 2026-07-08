// /feed — the scene pulse: posts from venues, bands, and musicians you follow.

import { useState } from "react";
import { Page } from "../components/shell";
import { Button, EmptyState, Mono } from "../components/ui";
import { PulseIcon } from "../components/icons";
import { FEED_POSTS } from "../lib/data";
import { useApp } from "../lib/store";
import { PostCard } from "../components/feed/PostCard";
import { TonightInTown, WhoToFollow } from "../components/feed/FeedRail";

type Tab = "following" | "everyone";

const TABS: { id: Tab; label: string }[] = [
  { id: "following", label: "Following" },
  { id: "everyone", label: "Everyone" },
];

export default function Feed() {
  const { state } = useApp();
  const [tab, setTab] = useState<Tab>("following");

  // players are treated as always-followed; bands/venues gate on follows
  const posts =
    tab === "everyone"
      ? FEED_POSTS
      : FEED_POSTS.filter(
          (p) => p.author.type === "player" || state.following.includes(p.author.id),
        );

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
