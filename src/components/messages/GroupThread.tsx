// Group chat for a pickup project / band (docs/V1_SPEC.md → "Group-chat
// screen"). Roster header with seat progress, sender-attributed messages,
// system lock lines (never a fee — those live in the 1:1 offer threads), and
// the post-gig "Stay as a group?" ready-check card (game-lobby style).

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getPlayer } from "../../lib/data";
import { useApp } from "../../lib/store";
import type { Conversation, Message } from "../../lib/types";
import { Avatar, Button, Mono } from "../ui";
import { ArrowLeftIcon, CheckIcon, CloseIcon, SendIcon, UsersIcon } from "../icons";

function memberInfo(playerId: string, meName: string): { name: string; seed: number } {
  if (playerId === "me") return { name: meName, seed: 99 };
  const p = getPlayer(playerId);
  return p ? { name: p.name, seed: p.seed } : { name: "Player", seed: 1 };
}

export function GroupThread({ conversation }: { conversation: Conversation }) {
  const { state, api } = useApp();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);

  const meName = state.user?.name ?? "You";
  const project = state.projects.find((p) => p.id === conversation.bandId);
  const title = conversation.title ?? project?.name ?? "Group chat";
  const roster = project?.members ?? [];

  // seat progress + ready-check state, derived from openings/bookings
  const seatOpenings = state.openings.filter(
    (o) => project && o.postedBy.id === project.id,
  );
  const lockedSeats = seatOpenings.filter((o) => o.status === "filled").length;
  const allFilled =
    seatOpenings.length > 0 && seatOpenings.every((o) => o.status !== "open");
  const seatBookings = state.bookings.filter(
    (b) => b.openingId && seatOpenings.some((o) => o.id === b.openingId),
  );
  const allReleased =
    seatBookings.length > 0 && seatBookings.every((b) => b.status === "released");
  const readyCheckLive =
    !!project && project.kind === "project" && !project.archived && allFilled && allReleased;

  const messages = conversation.messages;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
  }, [messages.length, readyCheckLive]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    api.sendGroupMessage(conversation.id, text);
    setDraft("");
  };

  const progressLabel =
    project?.kind === "standing"
      ? "Standing band"
      : project?.archived
        ? "Archived project"
        : seatOpenings.length > 0
          ? `${lockedSeats}/${seatOpenings.length} locked`
          : "Pickup project";

  return (
    <div className="mx-auto flex h-[calc(100dvh-5rem)] w-full max-w-2xl flex-col md:h-[calc(100dvh-2rem)]">
      {/* header — project lockup + roster strip */}
      <header className="border-b border-hairline-subtle bg-ink/95 px-2.5 py-2.5 backdrop-blur-md sm:px-4">
        <div className="flex items-center gap-2">
          <Link
            to="/messages"
            aria-label="Back to messages"
            className="rounded-full p-2 text-text-mid transition-colors hover:bg-surface-800 hover:text-text-hi"
          >
            <ArrowLeftIcon size={20} />
          </Link>
          <Link
            to={project ? `/b/${project.id}` : "#"}
            className="group flex min-w-0 flex-1 items-center gap-3"
          >
            <Avatar name={title} seed={project?.seed ?? 77} size={40} square />
            <div className="min-w-0">
              <p className="truncate font-semibold text-text-hi transition-colors group-hover:text-amber-300">
                {title}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-text-lo">
                <UsersIcon size={12} />
                {roster.length} in the group
                <Mono
                  className={`text-[10px] ${
                    project?.kind === "standing" ? "text-amber-300" : "text-cyan-300"
                  }`}
                >
                  · {progressLabel}
                </Mono>
              </p>
            </div>
          </Link>
          {/* roster avatars */}
          <div className="flex shrink-0 -space-x-2">
            {roster.slice(0, 4).map((m) => {
              const info = memberInfo(m.playerId, meName);
              return (
                <span key={m.playerId} className="rounded-full ring-2 ring-ink">
                  <Avatar name={info.name} seed={info.seed} size={26} />
                </span>
              );
            })}
          </div>
        </div>
      </header>

      {/* messages */}
      <div
        ref={listRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {messages.map((m) => (
          <GroupMessage key={m.id} m={m} meName={meName} />
        ))}

        {/* --------------------------- "Stay as a group?" ready-check card */}
        {project && (readyCheckLive || project.kind === "standing" || project.archived) && (
          <div className="w-full max-w-sm self-center">
            {project.kind === "standing" ? (
              <div className="rounded-2xl border border-amber-500/45 bg-gradient-to-br from-amber-500/15 via-amber-500/[0.04] to-transparent p-4 text-center">
                <p className="text-sm font-bold text-amber-300">⭐ You're a band now</p>
                <p className="mt-1 text-xs leading-relaxed text-text-mid">
                  {project.name} is standing — post the next gig as the band from
                  the "acting as" picker.
                </p>
              </div>
            ) : project.archived ? (
              <div className="rounded-2xl border border-hairline-strong bg-surface-900 p-4 text-center">
                <p className="text-sm font-semibold text-text-mid">📦 Project archived</p>
                <p className="mt-1 text-xs leading-relaxed text-text-lo">
                  Great gig — the roster and chat stay viewable.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-cyan-400/35 bg-cyan-400/[0.06] p-4">
                <p className="text-center text-sm font-bold text-cyan-300">
                  Stay as a group?
                </p>
                <p className="mt-1 text-center text-[11px] leading-relaxed text-text-mid">
                  Becomes a standing band if {meName.split(" ")[0]} and at least one
                  other member are in. Out just means "great one-off."
                </p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {project.members.map((m) => {
                    const info = memberInfo(m.playerId, meName);
                    const isMe = m.playerId === "me";
                    return (
                      <div
                        key={m.playerId}
                        className="flex items-center gap-2.5 rounded-xl bg-surface-900/70 px-2.5 py-2"
                      >
                        <Avatar name={info.name} seed={info.seed} size={28} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-text-hi">
                            {isMe ? "You" : info.name}
                          </p>
                          <Mono className="text-[9px] text-text-lo">{m.role}</Mono>
                        </div>
                        {isMe && !m.stay ? (
                          <div className="flex shrink-0 gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => api.setStay(project.id, "me", "in")}
                            >
                              <CheckIcon size={13} /> I'm in
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => api.setStay(project.id, "me", "out")}
                            >
                              <CloseIcon size={13} /> Out
                            </Button>
                          </div>
                        ) : m.stay === "in" ? (
                          <Mono className="shrink-0 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold text-cyan-300">
                            IN
                          </Mono>
                        ) : m.stay === "out" ? (
                          <Mono className="shrink-0 rounded-full border border-hairline-strong px-2 py-0.5 text-[9px] font-bold text-text-lo">
                            OUT
                          </Mono>
                        ) : (
                          <Mono className="blink shrink-0 text-[9px] text-text-faint">
                            deciding…
                          </Mono>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-hairline-subtle bg-ink/95 px-3 py-3">
        <form onSubmit={send} className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${title}…`}
            aria-label={`Message ${title}`}
            className="min-w-0 flex-1 rounded-full border border-hairline-strong bg-surface-800 px-4 py-2.5 text-sm placeholder:text-text-faint transition-colors focus:border-amber-500/70 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-ink-near transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-text-faint"
          >
            <SendIcon size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}

function GroupMessage({ m, meName }: { m: Message; meName: string }) {
  // system lines: centered mono — the public record (locks, wrap, promotion)
  if (m.system) {
    return (
      <div className="self-center px-6 text-center">
        <Mono className="text-[10px] leading-relaxed text-cyan-300/90">{m.text}</Mono>
      </div>
    );
  }

  const mine = m.senderId === "me" || m.from === "me";
  const info = mine
    ? { name: meName, seed: 99 }
    : memberInfo(m.senderId ?? "", meName);

  return (
    <div className={`max-w-[80%] sm:max-w-[70%] ${mine ? "self-end" : "self-start"}`}>
      {!mine && (
        <div className="mb-1 flex items-center gap-1.5 pl-1">
          <Avatar name={info.name} seed={info.seed} size={18} />
          <Mono className="text-[9px] text-text-lo">{info.name}</Mono>
        </div>
      )}
      <div
        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          mine
            ? "rounded-br-md border border-amber-500/30 bg-amber-500/15 text-text-hi"
            : "rounded-bl-md bg-surface-800 text-text-hi"
        }`}
      >
        {m.text}
      </div>
      <Mono
        className={`mt-1 block text-[9px] text-text-faint ${mine ? "pr-1 text-right" : "pl-1"}`}
      >
        {m.at}
      </Mono>
    </div>
  );
}
