// /feed — the scene pulse: posts from venues and bands you follow.

import { useState } from "react";
import { Page } from "../components/shell";
import { Button, EmptyState } from "../components/ui";
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

  // musicians are treated as always-followed; bands/venues gate on follows
  const posts =
    tab === "everyone"
      ? FEED_POSTS
      : FEED_POSTS.filter(
          (p) => p.author.type === "musician" || state.following.includes(p.author.id),
        );

  return (
    <Page wide title="Your scene" subtitle="Austin, TX">
      <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
        {/* main column */}
        <div className="min-w-0">
          {/* segmented control */}
          <div
            role="tablist"
            aria-label="Feed filter"
            className="mb-4 flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 sm:inline-flex"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                  tab === t.id
                    ? "bg-zinc-800 text-amber-300"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* nudge when every band/venue has been unfollowed but musician
              posts keep the feed alive */}
          {tab === "following" && state.following.length === 0 && posts.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <p className="text-sm text-zinc-400">
                You're not following any venues or bands — only musician reels land here.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setTab("everyone")}>
                See Everyone →
              </Button>
            </div>
          )}

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
              <p className="py-2 text-center text-xs text-zinc-600">
                You're all caught up — go play something.
              </p>
            </div>
          )}
        </div>

        {/* side rail: right column at lg+, stacked below the feed on mobile */}
        <div className="min-w-0 space-y-6 lg:sticky lg:top-5">
          <WhoToFollow />
          <TonightInTown />
        </div>
      </div>
    </Page>
  );
}
