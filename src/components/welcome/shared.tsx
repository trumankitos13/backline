// Shared bits for the Backline front door (Welcome hero + onboarding + auth):
// the stage-light backdrop, the live equalizer accent, and the Backline-styled
// text field. Kept here so Welcome/SignupSteps/AuthPanel stay in one look.

import { GRAIN_DATA_URI } from "../../lib/generative";

/** Backline dark text field — hairline border, amber focus ring. */
export const INPUT_CLASS =
  "w-full rounded-xl border border-hairline-strong bg-surface-800 px-4 py-3 text-sm text-text-hi placeholder:text-text-faint transition-colors focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 focus:outline-none";

/**
 * The brand moment's backdrop: full-bleed stage beams (blurred amber + cyan
 * radial blobs that slowly drift) over faint film grain, settling into the ink.
 */
export function StageBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* stage beams — amber warm key light + cyan cool fill, gently floating */}
      <div
        className="floaty absolute -top-48 left-1/2 h-[560px] w-[860px] -translate-x-1/2 rounded-full blur-[130px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,138,61,0.22), transparent)",
        }}
      />
      <div
        className="floaty absolute top-16 -left-28 h-[380px] w-[380px] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(75,214,207,0.16), transparent)",
          animationDelay: "-3s",
        }}
      />
      <div
        className="floaty absolute top-4 -right-24 h-[360px] w-[360px] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,138,61,0.10), transparent)",
          animationDelay: "-5.5s",
        }}
      />
      {/* faint film grain */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-soft-light"
        style={{ backgroundImage: `url("${GRAIN_DATA_URI}")`, backgroundSize: "180px" }}
      />
      {/* vignette so the beams bleed down into the page */}
      <div className="absolute inset-x-0 top-[560px] bottom-0 bg-gradient-to-b from-transparent to-ink" />
    </div>
  );
}

/** a live equalizer accent — a few amber bars pumping (reel "alive" motif). */
export function EqAccent({ className = "" }: { className?: string }) {
  const heights = [0.5, 0.85, 0.35, 1, 0.6, 0.9, 0.45];
  return (
    <div
      aria-hidden="true"
      className={`flex h-6 items-end justify-center gap-1 ${className}`}
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="eq-bar w-1 rounded-full bg-amber-300"
          style={{
            height: `${h * 100}%`,
            animationDelay: `${(i * 110) % 900}ms`,
            animationDuration: `${720 + ((i * 61) % 480)}ms`,
          }}
        />
      ))}
    </div>
  );
}
