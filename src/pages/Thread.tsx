// Full-bleed chat thread: messages, booking offer cards, and the mock payment
// flow. The :id param is a conversation id (e.g. "c-m-dre"); a conversation
// may not exist yet — it's created lazily by the store on first send.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getMusician } from "../lib/data";
import { instrument } from "../lib/instruments";
import { useApp } from "../lib/store";
import { Avatar, Button, EmptyState } from "../components/ui";
import {
  ArrowLeftIcon,
  ChatIcon,
  DollarIcon,
  SendIcon,
  VerifiedIcon,
} from "../components/icons";
import { BookingCard } from "../components/messages/BookingCard";
import { BookingSheet } from "../components/messages/BookingSheet";
import { PaymentSheet } from "../components/messages/PaymentSheet";

export default function Thread() {
  const { id } = useParams<{ id: string }>();
  // key by conversation id so drafts/sheets reset when switching threads
  return <ThreadView key={id ?? "none"} id={id ?? ""} />;
}

function ThreadView({ id }: { id: string }) {
  const location = useLocation();
  const { state, api } = useApp();
  const locState = (location.state ?? {}) as {
    prefill?: string;
    openBooking?: boolean;
  };

  // Resolve the musician. Prefer an existing conversation's musicianId;
  // otherwise strip the "c-" prefix (ids follow the c-<musicianId> convention).
  const byId = state.conversations.find((c) => c.id === id);
  const musicianId = byId?.musicianId ?? id.slice(2);
  const musician = getMusician(musicianId);
  const conversation =
    byId ?? state.conversations.find((c) => c.musicianId === musicianId);

  const [draft, setDraft] = useState(() => locState.prefill ?? "");
  const [bookingOpen, setBookingOpen] = useState(() => !!locState.openBooking);
  const [payId, setPayId] = useState<string | null>(null);

  const messages = conversation?.messages ?? [];
  const listRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);

  // pin the view to the newest message (instant on mount, smooth after)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: firstScroll.current ? "auto" : "smooth",
    });
    firstScroll.current = false;
  }, [messages.length]);

  // clear the unread badge — guarded so it can't dispatch in a loop
  const convId = conversation?.id;
  const unread = conversation?.unread ?? 0;
  useEffect(() => {
    if (convId && unread > 0) api.markRead(convId);
  }, [convId, unread, api]);

  if (!musician) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <Link
          to="/messages"
          className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <ArrowLeftIcon size={16} /> Back to messages
        </Link>
        <EmptyState
          icon={<ChatIcon size={34} />}
          title="We couldn't find that player"
          body="This thread points at a musician who isn't on Backline — the link may be old. Head back and pick up another conversation."
          action={
            <Link to="/messages">
              <Button variant="secondary" size="sm">
                All messages
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const first = musician.name.split(" ")[0] ?? musician.name;
  const labels = musician.instruments
    .map((i) => instrument(i.id).label)
    .join(" + ");
  const payBooking = payId
    ? state.bookings.find((b) => b.id === payId)
    : undefined;

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    api.sendMessage(musician.id, text);
    setDraft("");
  };

  return (
    // fills the viewport minus the shell's bottom padding (mobile tab bar)
    <div className="mx-auto flex h-[calc(100dvh-5rem)] w-full max-w-2xl flex-col md:h-[calc(100dvh-2rem)]">
      {/* header */}
      <header className="flex items-center gap-2 border-b border-zinc-800/70 bg-zinc-950/95 px-2.5 py-2.5 backdrop-blur-md sm:px-4">
        <Link
          to="/messages"
          aria-label="Back to messages"
          className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          <ArrowLeftIcon size={20} />
        </Link>
        <Link
          to={`/m/${musician.id}`}
          className="group flex min-w-0 flex-1 items-center gap-3"
        >
          <Avatar name={musician.name} seed={musician.seed} size={40} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-semibold text-zinc-100 transition-colors group-hover:text-amber-300">
              <span className="truncate">{musician.name}</span>
              {musician.verified && <VerifiedIcon size={15} className="shrink-0" />}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {labels} · replies in ~{musician.responseMins}m
            </p>
          </div>
        </Link>
        {musician.availableTonight && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <span className="glow-pulse h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Free tonight
          </span>
        )}
      </header>

      {/* message list */}
      <div
        ref={listRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="my-auto flex flex-col items-center gap-3 px-6 py-10 text-center">
            <Avatar name={musician.name} seed={musician.seed} size={72} />
            <div>
              <p className="flex items-center justify-center gap-1.5 text-lg font-semibold">
                {musician.name}
                {musician.verified && <VerifiedIcon size={16} />}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {labels} · usually replies in ~{musician.responseMins} min
              </p>
            </div>
            <p className="max-w-xs text-sm text-zinc-400">
              Say hey — or skip the small talk and send a booking offer straight
              away.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBookingOpen(true)}
            >
              <DollarIcon size={14} /> Book {first} for a gig
            </Button>
          </div>
        )}

        {messages.map((m) => {
          if (m.bookingId) {
            const bk = state.bookings.find((b) => b.id === m.bookingId);
            return (
              <div key={m.id} className="w-full max-w-sm self-end">
                {bk ? (
                  <BookingCard
                    booking={bk}
                    musician={musician}
                    onPay={(b) => setPayId(b.id)}
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                    Booking offer no longer available
                  </p>
                )}
                <p className="mt-1 pr-1 text-right text-[10px] text-zinc-600">
                  {m.at}
                </p>
              </div>
            );
          }
          const mine = m.from === "me";
          return (
            <div
              key={m.id}
              className={`max-w-[80%] sm:max-w-[70%] ${mine ? "self-end" : "self-start"}`}
            >
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  mine
                    ? "rounded-br-md border border-amber-400/30 bg-amber-400/15 text-amber-50"
                    : "rounded-bl-md bg-zinc-800 text-zinc-100"
                }`}
              >
                {m.text}
              </div>
              <p
                className={`mt-1 text-[10px] text-zinc-600 ${
                  mine ? "pr-1 text-right" : "pl-1"
                }`}
              >
                {m.at}
              </p>
            </div>
          );
        })}
      </div>

      {/* composer */}
      <div className="border-t border-zinc-800/70 bg-zinc-950/95 px-3 py-3">
        <form onSubmit={send} className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setBookingOpen(true)}
            className="shrink-0"
            title={`Send ${first} a booking offer`}
          >
            <DollarIcon size={16} /> Book
          </Button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${first}…`}
            aria-label={`Message ${musician.name}`}
            className="min-w-0 flex-1 rounded-full border border-zinc-700/80 bg-zinc-900 px-4 py-2.5 text-sm placeholder:text-zinc-600 transition-colors focus:border-amber-400/70 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendIcon size={17} />
          </button>
        </form>
      </div>

      {/* sheets */}
      <BookingSheet
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        musician={musician}
      />
      {payBooking && (
        <PaymentSheet
          booking={payBooking}
          musician={musician}
          onClose={() => setPayId(null)}
        />
      )}
    </div>
  );
}
