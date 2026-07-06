// Conversation list: unread threads first, booking offers surfaced in previews.

import { Link } from "react-router-dom";
import { Page } from "../components/shell";
import { Avatar, Button, Card, EmptyState, Mono } from "../components/ui";
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
        <Card className="divide-y divide-hairline-subtle overflow-hidden">
          {rows.map(({ c, m }) => {
            const last = c.messages[c.messages.length - 1];
            const hasUnread = c.unread > 0;
            return (
              <Link
                key={c.id}
                to={`/messages/${c.id}`}
                className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-850"
              >
                <Avatar name={m.name} seed={m.seed} size={46} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={`truncate ${
                          hasUnread
                            ? "font-bold text-text-hi"
                            : "font-semibold text-text-mid"
                        }`}
                      >
                        {m.name}
                      </span>
                      {m.verified && (
                        <VerifiedIcon size={14} className="shrink-0" />
                      )}
                    </span>
                    <Mono
                      className={`shrink-0 text-[10px] ${
                        hasUnread ? "font-bold text-amber-300" : "text-text-lo"
                      }`}
                    >
                      {last?.at ?? ""}
                    </Mono>
                  </div>
                  <Mono className="mt-0.5 block text-[10px] text-text-lo">
                    {m.instruments.map((i) => instrument(i.id).short).join(" · ")}
                  </Mono>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-sm ${
                        hasUnread ? "font-medium text-text-hi" : "text-text-lo"
                      }`}
                    >
                      {previewOf(last)}
                    </p>
                    {hasUnread && (
                      <span
                        className="mono shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-ink-near"
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
