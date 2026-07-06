// The in-page entry to the SOS flow: a compact amber "stage light" banner that
// opens the full SOS overlay (radar search → ranked subs). Amber is scarce, so
// this and the shell's SOS button are the only warm CTAs on the page.

import { BoltIcon } from "../icons";
import { Button, Mono } from "../ui";

export function SosBanner({
  tonightCount,
  onOpen,
}: {
  /** players marked free tonight, for the scarcity line */
  tonightCount: number;
  onOpen: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-surface-900 p-4 shadow-[0_0_36px_-14px_var(--accent)]">
      {/* faint stage-light wash, top-left */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-12 h-40 w-40 rounded-full bg-amber-500/15 blur-2xl"
      />
      <div className="relative flex items-start gap-3">
        <span className="pulse-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-ink-near shadow-[0_10px_30px_-10px_var(--accent)]">
          <BoltIcon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <Mono className="text-[10px] font-bold text-amber-300">
            Gig at risk
          </Mono>
          <h2 className="mt-0.5 text-base font-bold text-text-hi">
            Someone bailed tonight?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-text-mid">
            <span className="mono text-text-hi">{tonightCount}</span> players are
            free tonight and ready to sub in. Radar-search the closest ones.
          </p>
          <Button variant="sos" size="md" className="mt-3" onClick={onOpen}>
            <BoltIcon size={16} />
            Find a sub — SOS
          </Button>
        </div>
      </div>
    </div>
  );
}
