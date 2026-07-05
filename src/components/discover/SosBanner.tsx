// The Discover page's headline feature: an amber "gig at risk" banner that
// flips into SOS mode — filters lock to available-tonight, sorted by fastest
// reply — and reports how many players can cover.

import { BoltIcon, CloseIcon } from "../icons";
import { Button } from "../ui";

export function SosBanner({
  active,
  count,
  fastestMins,
  tonightTotal,
  onActivate,
  onDismiss,
}: {
  active: boolean;
  /** players matching the current filters who can cover tonight */
  count: number;
  /** quickest response time among them, in minutes */
  fastestMins: number | null;
  /** total players marked free tonight, ignoring filters */
  tonightTotal: number;
  onActivate: () => void;
  onDismiss: () => void;
}) {
  if (!active) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/15 via-zinc-900/60 to-zinc-900/60 p-4 shadow-[0_0_36px_-10px_rgba(251,191,36,0.45)]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <BoltIcon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-amber-100">
              Drummer bailed? Gig at risk?
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              {tonightTotal} players nearby are marked free tonight. Flip on SOS
              mode and we'll line them up, fastest repliers first.
            </p>
            <Button size="sm" className="mt-3" onClick={onActivate}>
              <BoltIcon size={14} />
              Find a sub for tonight
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-amber-400/60 bg-amber-400/10 p-4 shadow-[0_0_48px_-10px_rgba(251,191,36,0.6)]">
      {/* pulsing ring keeps the urgency without flickering the copy */}
      <span
        className="glow-pulse pointer-events-none absolute -inset-px rounded-2xl border-2 border-amber-400/60"
        aria-hidden="true"
      />
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-zinc-950 shadow-[0_0_20px_-2px_rgba(251,191,36,0.8)]">
          <BoltIcon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-widest text-amber-300 uppercase">
            SOS mode on
          </p>
          <h2 className="mt-0.5 text-base font-bold text-zinc-50">
            {count === 0
              ? "No one free tonight matches"
              : count === 1
                ? "1 player can cover tonight"
                : `${count} players can cover tonight`}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            {count > 0 && fastestMins != null
              ? `Sorted by fastest reply — quickest is ~${fastestMins} min. Tap Message and lock your sub in.`
              : "Widen the distance or clear an instrument — somebody out there owns a van and says yes."}
          </p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Turn off SOS mode"
          className="relative -m-1 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-zinc-200"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}
