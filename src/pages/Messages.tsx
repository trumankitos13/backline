// Conversation list: unread threads first, booking offers surfaced in previews.

import { Link } from "react-router-dom";
import { Page } from "../components/shell";
import { Avatar, Button, Card, EmptyState } from "../components/ui";
import { ChatIcon, VerifiedIcon } from "../components/icons";
import { getMusician } from "../lib/data";
import { instrument } from "../lib/instruments";
import { useApp } from "../lib/store";
import type { Message } from "../lib/types";

function previewOf(last: Message | undefined): string {
  if (!last) return "Say hey 👋";
  if (last.bookingId) return "📋 Booking offer";
  const text = last.text ?? "";
  return last.from === "me" ? `You: ${text}` : text;
}

export default function Messages() {
  const { state } = useApp();

  const rows = [...state.conversations]
    .sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0))
    .flatMap((c) => {
      const m = getMusician(c.musicianId);
      return m ? [{ c, m }] : [];
    });

  return (
    <Page
      title="Messages"
      subtitle="Chats and booking offers with players around town."
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<ChatIcon size={34} />}
          title="No conversations yet"
          body="Find a player you like, say hey, and book them for a gig — every thread lands here."
          action={
            <Link to="/">
              <Button size="sm">Find players</Button>
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-zinc-800/70 overflow-hidden">
          {rows.map(({ c, m }) => {
            const last = c.messages[c.messages.length - 1];
            const hasUnread = c.unread > 0;
            return (
              <Link
                key={c.id}
                to={`/messages/${c.id}`}
                className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-900"
              >
                <Avatar name={m.name} seed={m.seed} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={`truncate ${
                          hasUnread
                            ? "font-bold text-zinc-50"
                            : "font-semibold text-zinc-200"
                        }`}
                      >
                        {m.name}
                      </span>
                      {m.verified && (
                        <VerifiedIcon size={14} className="shrink-0" />
                      )}
                    </span>
                    <span
                      className={`shrink-0 text-[11px] ${
                        hasUnread ? "font-semibold text-amber-300" : "text-zinc-500"
                      }`}
                    >
                      {last?.at ?? ""}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                    {m.instruments.map((i) => instrument(i.id).short).join(" · ")}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-sm ${
                        hasUnread ? "font-medium text-zinc-100" : "text-zinc-500"
                      }`}
                    >
                      {previewOf(last)}
                    </p>
                    {hasUnread && (
                      <span
                        className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-zinc-950"
                        aria-label={`${c.unread} unread`}
                      >
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </Page>
  );
}
