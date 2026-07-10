// The SOS flow — an urgent-but-fun overlay that sits atop Discover. The shell's
// SOS button and the in-page SosBanner both open it via ?sos=open. It's a small
// state machine: config → searching (radar) → results (ranked by who arrives
// fastest) → sent. Normal Discover browsing stays alive underneath.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PLAYERS } from "../../lib/data";
import { INSTRUMENTS, instrument } from "../../lib/instruments";
import { ratingSummary } from "../../lib/ratings";
import { useApp } from "../../lib/store";
import type { InstrumentId, Player } from "../../lib/types";
import {
  Button,
  Chip,
  Mono,
  RatingNumber,
  SuccessCheck,
  VerifiedBadge,
} from "../ui";
import { BoltIcon, CloseIcon, InstrumentIcon, MapPinIcon } from "../icons";
import { VideoTile, ReelViewer } from "../video";

type Phase = "config" | "searching" | "results" | "sent";
type WhenKey = "tonight" | "tomorrow" | "weekend";

const CITY = "Austin";
const SEARCH_MS = 2100;

const WHEN_OPTIONS: { value: WhenKey; label: string }[] = [
  { value: "tonight", label: "Tonight" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "weekend", label: "This weekend" },
];

const WHEN_LABEL: Record<WhenKey, string> = {
  tonight: "tonight",
  tomorrow: "tomorrow",
  weekend: "this weekend",
};

/** player-nouns so the cyan hint reads like the scene talks. */
const PLAYER_NOUN: Partial<Record<InstrumentId, string>> = {
  drums: "drummers",
  bass: "bassists",
  guitar: "guitarists",
  keys: "keys players",
  vocals: "vocalists",
  sax: "sax players",
  trumpet: "trumpeters",
  violin: "fiddlers",
  "pedal-steel": "steel players",
  dj: "DJs",
  "sound-tech": "engineers",
  "lighting-tech": "lighting techs",
};

/** deterministic "can be there" clock time — closer players arrive sooner. */
function etaLabel(distanceMiles: number): string {
  const mins = 20 * 60 + Math.round(distanceMiles * 4) + 2; // from an 8:00 downbeat
  const h = Math.floor(mins / 60) % 12 || 12;
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

const TICKS = [
  "PINGING EAST AUSTIN",
  "CHECKING WHO'S AWAKE",
  "260 PLAYERS IN RANGE",
  "SORTING BY ETA",
  "RINGING FASTEST REPLIERS",
];

function Ticker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % TICKS.length), 520);
    return () => window.clearInterval(t);
  }, []);
  return <Mono className="text-[11px] text-cyan-300">{TICKS[i]}…</Mono>;
}

export function SosFlow({
  open,
  onClose,
  initialRole = null,
  initialOpeningId = null,
}: {
  open: boolean;
  onClose: () => void;
  /** who bailed, from the ?role= deep link — preselected in the config step. */
  initialRole?: InstrumentId | null;
  /** filling a posted Opening (?opening=) — offers carry it so holds lock the seat. */
  initialOpeningId?: string | null;
}) {
  const navigate = useNavigate();
  const { state } = useApp();

  const [phase, setPhase] = useState<Phase>("config");
  const [bailed, setBailed] = useState<InstrumentId | null>(initialRole ?? "drums");
  const [when, setWhen] = useState<WhenKey>("tonight");
  const [reel, setReel] = useState<{ musician: Player; index: number } | null>(null);

  // fresh config each time the overlay is opened; honour the deep-linked role.
  useEffect(() => {
    if (open) {
      setPhase("config");
      setReel(null);
      setBailed(initialRole ?? "drums");
    }
  }, [open, initialRole]);

  // radar dwell, then reveal the ranked subs
  useEffect(() => {
    if (phase !== "searching") return;
    const t = window.setTimeout(() => setPhase("results"), SEARCH_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // esc + body scroll lock while the sheet is up
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const matches = useMemo(() => {
    const list = PLAYERS.filter((m) =>
      bailed ? m.instruments.some((i) => i.id === bailed) : true,
    ).filter((m) => (when === "tonight" ? m.availableTonight : true));
    return [...list]
      .sort((a, b) => a.responseMins - b.responseMins || a.distanceMiles - b.distanceMiles)
      .slice(0, 6);
  }, [bailed, when]);

  const hintCount = useMemo(
    () =>
      PLAYERS.filter(
        (m) =>
          m.availableTonight &&
          m.distanceMiles <= 5 &&
          (bailed ? m.instruments.some((i) => i.id === bailed) : true),
      ).length,
    [bailed],
  );

  if (!open) return null;

  const noun = (bailed && PLAYER_NOUN[bailed]) || "players";
  const bailedLabel = bailed ? instrument(bailed).label : "any instrument";

  function go(to: string, routerState?: Record<string, unknown>) {
    onClose();
    navigate(to, routerState ? { state: routerState } : undefined);
  }

  const phaseTitle =
    phase === "config"
      ? "Find a sub, fast"
      : phase === "searching"
        ? "Scanning the scene…"
        : phase === "results"
          ? matches.length === 1
            ? "1 sub can make it"
            : `${matches.length} subs can make it`
          : "Alert sent";

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Find a sub — SOS"
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <div
          className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[26px] border border-hairline bg-surface-sheet p-5 pb-6 shadow-[0_-30px_60px_-30px_#000] rise sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* mobile grabber */}
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline-strong sm:hidden" />

          {/* header lockup */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="pulse-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-ink-near shadow-[0_10px_30px_-10px_var(--accent)]">
                <BoltIcon size={18} />
              </span>
              <div className="min-w-0">
                <Mono className="block text-[10px] font-bold text-amber-300">Backline SOS</Mono>
                <p className="truncate font-semibold text-text-hi">{phaseTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close SOS"
              className="shrink-0 rounded-full p-1.5 text-text-lo transition-colors hover:bg-surface-800 hover:text-text-hi"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          {/* ---------------------------------------------------------- config */}
          {phase === "config" && (
            <div className="mt-5 space-y-5">
              <div>
                <Mono className="text-[11px] text-text-lo">Who bailed?</Mono>
                <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
                  {INSTRUMENTS.map((ins) => (
                    <Chip
                      key={ins.id}
                      active={bailed === ins.id}
                      onClick={() => setBailed(bailed === ins.id ? null : ins.id)}
                    >
                      <InstrumentIcon instrument={ins.id} size={13} />
                      {ins.short}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <Mono className="text-[11px] text-text-lo">When&apos;s the gig?</Mono>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WHEN_OPTIONS.map((o) => (
                    <Chip key={o.value} active={when === o.value} onClick={() => setWhen(o.value)}>
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* cyan info signal */}
              <div className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2.5">
                <span className="blink h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                <Mono className="text-[11px] text-cyan-300">
                  {hintCount} {noun} free tonight within 5 mi
                </Mono>
              </div>

              <Button
                variant="sos"
                size="lg"
                className="w-full"
                onClick={() => setPhase("searching")}
              >
                <BoltIcon size={18} />
                Search near me
              </Button>
            </div>
          )}

          {/* ------------------------------------------------------- searching */}
          {phase === "searching" && (
            <div className="mt-6 flex flex-col items-center">
              <div className="relative flex h-44 w-44 items-center justify-center">
                {[0, 0.7, 1.4].map((delay) => (
                  <span
                    key={delay}
                    className="radar-ring absolute inset-0 rounded-full border-2 border-amber-500/60"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-ink-near shadow-[0_0_30px_-4px_var(--accent)]">
                  <BoltIcon size={26} />
                </span>
              </div>
              <p className="mt-5 font-semibold text-text-hi">Searching {CITY}…</p>
              <div className="mt-1.5">
                <Ticker />
              </div>

              {/* skeleton rows */}
              <div className="mt-6 w-full space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border border-hairline-subtle bg-surface-900 p-3"
                  >
                    <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-surface-800" />
                    <div className="flex-1 space-y-2">
                      <span className="block h-3 w-1/2 animate-pulse rounded bg-surface-800" />
                      <span className="block h-2.5 w-1/3 animate-pulse rounded bg-surface-800" />
                    </div>
                    <span className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-surface-800" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------- results */}
          {phase === "results" && (
            <div className="mt-4">
              <p className="text-sm leading-relaxed text-text-mid">
                {matches.length === 0
                  ? "No subs free for that slot — widen the instrument or the day."
                  : when === "tonight" ? (
                      <>
                        <span className="text-text-hi">{matches.length} subs</span> can make it —
                        sorted by who can get there fastest.
                      </>
                    ) : (
                      <>
                        <span className="text-text-hi">{matches.length} subs</span> free{" "}
                        {WHEN_LABEL[when]} — fastest to reply first.
                      </>
                    )}
              </p>

              <div className="mt-3 space-y-2.5">
                {matches.map((m, i) => (
                  <SubRow
                    key={m.id}
                    musician={m}
                    when={when}
                    ratingsGiven={state.ratingsGiven[m.id]}
                    fastest={i === 0}
                    onOpenReel={() => m.videos[0] && setReel({ musician: m, index: 0 })}
                    onMessage={() => go(`/messages/c-${m.id}`)}
                    onOffer={() =>
                      go(`/messages/c-${m.id}`, {
                        openBooking: true,
                        ...(initialOpeningId ? { openingId: initialOpeningId } : {}),
                      })
                    }
                  />
                ))}
              </div>

              {matches.length > 0 && (
                <Button
                  variant="sos"
                  size="lg"
                  className="mt-4 w-full"
                  onClick={() => setPhase("sent")}
                >
                  <BoltIcon size={18} />
                  Alert all {matches.length} at once
                </Button>
              )}
              <button
                onClick={() => setPhase("config")}
                className="mono mt-3 w-full text-center text-[11px] font-bold text-text-lo transition-colors hover:text-text-mid"
              >
                Adjust search
              </button>
            </div>
          )}

          {/* ------------------------------------------------------------ sent */}
          {phase === "sent" && (
            <div className="mt-6 flex flex-col items-center gap-3 py-4 text-center">
              <SuccessCheck size={64} />
              <div>
                <p className="text-lg font-semibold text-text-hi">
                  Alert sent to {matches.length} {matches.length === 1 ? "sub" : "subs"}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-text-mid">
                  First yes wins. We&apos;ll ping you the second someone grabs it — keep an eye on
                  Chats.
                </p>
              </div>
              <Mono className="text-[10px] text-cyan-300">
                Broadcast · {WHEN_LABEL[when]} · {bailedLabel}
              </Mono>
              <div className="mt-2 grid w-full grid-cols-2 gap-2">
                <Button variant="secondary" size="md" className="w-full" onClick={() => setPhase("results")}>
                  Back to list
                </Button>
                <Button variant="primary" size="md" className="w-full" onClick={() => go("/messages")}>
                  Go to Chats
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {reel && (
        <ReelViewer
          clips={reel.musician.videos}
          startIndex={reel.index}
          ownerName={reel.musician.name}
          onClose={() => setReel(null)}
        />
      )}
    </>
  );
}

function SubRow({
  musician: m,
  when,
  ratingsGiven,
  fastest,
  onOpenReel,
  onMessage,
  onOffer,
}: {
  musician: Player;
  when: WhenKey;
  ratingsGiven?: number[];
  fastest: boolean;
  onOpenReel: () => void;
  onMessage: () => void;
  onOffer: () => void;
}) {
  const rating = ratingSummary(m, ratingsGiven);
  const clip = m.videos[0];

  return (
    <div
      className={`relative rounded-2xl border bg-surface-900 p-3 ${
        fastest ? "border-amber-500/45" : "border-hairline-subtle"
      }`}
    >
      {fastest && (
        <span className="absolute -top-2.5 right-3 mono inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-ink-near shadow-[0_6px_20px_-8px_var(--accent)]">
          <span className="text-[11px] leading-none">⚡</span>
          FASTEST · {m.distanceMiles} MI
        </span>
      )}

      <div className="flex gap-3">
        {clip && (
          <VideoTile
            clip={clip}
            onPlay={onOpenReel}
            className="w-14 self-start"
            showStats={false}
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-text-hi">{m.name}</span>
                {m.verified && <VerifiedBadge />}
              </p>
              <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-text-mid">
                <MapPinIcon size={12} className="text-text-lo" />
                {m.neighborhood}
                <Mono className="text-[11px] text-text-hi">
                  · ${m.rate.min}–{m.rate.max}
                </Mono>
              </span>
            </div>
            <RatingNumber avg={rating.avg} count={rating.count} size="sm" className="shrink-0" />
          </div>

          {/* amber availability strip */}
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1">
            <span className="blink h-1.5 w-1.5 rounded-full bg-amber-500" />
            <Mono className="text-[10px] text-amber-300">
              {when === "tonight"
                ? `Free tonight · can be there ${etaLabel(m.distanceMiles)}`
                : `Free ${WHEN_LABEL[when]} · replies ~${m.responseMins}m`}
            </Mono>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="md" className="w-full" onClick={onMessage}>
              Message
            </Button>
            <Button variant="primary" size="md" className="w-full" onClick={onOffer}>
              Send offer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
