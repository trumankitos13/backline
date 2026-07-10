// Conversation list: unread threads first, booking offers surfaced in previews.

import { Link } from "react-router-dom";
import { Page } from "../components/shell";
import { Avatar, Button, Card, EmptyState, Mono } from "../components/ui";
import { ChatIcon, UsersIcon, VerifiedIcon } from "../components/icons";
import { getPlayer } from "../lib/data";
import { instrument } from "../lib/instruments";
import { useApp } from "../lib/store";
import type { Conversation, Message } from "../lib/types";

function previewOf(last: Message | undefined, group = false): string {
  if (!last) return "Say hey 👋";
  if (last.bookingId) return "📋 Booking offer";
  const text = last.text ?? "";
  if (last.system) return text;
  if (group && last.senderId && last.senderId !== "me") {
    const first = getPlayer(last.senderId)?.name.split(" ")[0];
    return first ? `${first}: ${text}` : text;
  }
  return last.from === "me" ? `You: ${text}` : text;
}

interface RowInfo {
  c: Conversation;
  name: string;
  seed: number;
  square: boolean;
  sub: string;
  verified?: boolean;
}

export default function Messages() {
  const { state } = useApp();

  const rows: RowInfo[] = [...state.conversations]
    .sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0))
    .flatMap((c): RowInfo[] => {
      if (c.kind === "group") {
        const project = state.projects.find((p) => p.id === c.bandId);
        const count = c.participantIds?.length ?? 0;
        return [
          {
            c,
            name: c.title ?? project?.name ?? "Group chat",
            seed: project?.seed ?? 77,
            square: true,
            sub:
              project?.kind === "standing"
                ? `Standing band · ${count} members`
                : `Pickup project · ${count} in the group`,
          },
        ];
      }
      const m = c.playerId ? getPlayer(c.playerId) : undefined;
      return m
        ? [
            {
              c,
              name: m.name,
              seed: m.seed,
              square: false,
              sub: m.instruments.map((i) => instrument(i.id).short).join(" · "),
              verified: m.verified,
            },
          ]
        : [];
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
          {rows.map(({ c, name, seed, square, sub, verified }) => {
            const last = c.messages[c.messages.length - 1];
            const hasUnread = c.unread > 0;
            const group = c.kind === "group";
            return (
              <Link
                key={c.id}
                to={`/messages/${c.id}`}
                className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-850"
              >
                <Avatar name={name} seed={seed} size={46} square={square} />
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
                        {name}
                      </span>
                      {verified && (
                        <VerifiedIcon size={14} className="shrink-0" />
                      )}
                      {group && (
                        <UsersIcon size={13} className="shrink-0 text-text-lo" />
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
                  <Mono className="mt-0.5 block text-[10px] text-text-lo">{sub}</Mono>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-sm ${
                        hasUnread ? "font-medium text-text-hi" : "text-text-lo"
                      }`}
                    >
                      {previewOf(last, group)}
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
