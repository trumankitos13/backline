// Shared UI primitives — Backline design system. Dark-first, amber stage-light
// accent (scarce), cyan cool-signal, Space Grotesk + Space Mono. Keep these
// dumb and presentational. Signatures are stable across the app.

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { CheckIcon, CloseIcon, StarIcon, VerifiedIcon } from "./icons";
import { fingerprint } from "../lib/generative";

// ------------------------------------------------------------------ wordmark

/** the backlıne wordmark — dotless ı lit by an amber amp-standby dot. */
export function Wordmark({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const dot = Math.max(3, Math.round(size * 0.2));
  return (
    <span
      className={`inline-flex items-baseline font-bold tracking-tight text-text-hi ${className}`}
      style={{ fontSize: size, letterSpacing: "-0.04em" }}
    >
      backl
      {/* dotless i + orange standby dot as its tittle */}
      <span className="relative inline-block" aria-hidden="true">
        ı
        <span
          className="absolute left-1/2 rounded-full bg-amber-500"
          style={{
            width: dot,
            height: dot,
            top: `-${dot * 0.35}px`,
            transform: "translateX(-50%)",
            boxShadow: "0 0 0.5em var(--accent)",
          }}
        />
      </span>
      ne
    </span>
  );
}

// -------------------------------------------------------------------- mono

/** the "tech-rider" data layer — mono, uppercase, wide-tracked micro-labels. */
export function Mono({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`mono ${className}`}>{children}</span>;
}

// ------------------------------------------------------------------ avatar

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * Fingerprint avatar — a deterministic generative identity mark (see
 * generative.ts). Per the Backline identity, every avatar is a ROUNDED SQUARE
 * (radius scales with size, ~11–22px); the `square` prop is retained for
 * call-site compatibility but no longer toggles a circle.
 */
export function Avatar({
  name,
  seed,
  src,
  size = 44,
  square: _square = false,
  className = "",
}: {
  name: string;
  seed: number;
  src?: string;
  size?: number;
  square?: boolean;
  className?: string;
}) {
  const fp = fingerprint(`${name}-${seed}`);
  const showInitials = size >= 30;
  const radius = Math.round(Math.min(22, Math.max(9, size * 0.28)));
  return (
    <div
      className={`relative shrink-0 overflow-hidden ring-1 ring-white/10 ${className}`}
      style={{ width: size, height: size, borderRadius: radius, background: fp.background }}
      aria-hidden="true"
    >
      {src && (
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <span className={`absolute inset-0 bg-gradient-to-t from-black/35 to-transparent ${src ? "opacity-45" : ""}`} />
      {showInitials && !src && (
        <span
          className="mono absolute right-1 bottom-0.5 font-bold text-white/90"
          style={{ fontSize: Math.max(8, size * 0.2), letterSpacing: "0.02em" }}
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- chips

export function Chip({
  children,
  active = false,
  onClick,
  className = "",
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const classes = `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
      : "border-hairline-strong bg-surface-800 text-text-mid"
  } ${onClick ? "cursor-pointer hover:border-text-faint" : ""} ${className}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }
  return <span className={classes}>{children}</span>;
}

// ------------------------------------------------------------------ badges

type BadgeTone = "cyan" | "amber" | "amber-solid" | "neutral";

const BADGE_TONES: Record<BadgeTone, string> = {
  cyan: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  "amber-solid": "border-transparent bg-amber-500 text-ink-near",
  neutral: "border-hairline-strong bg-surface-800 text-text-mid",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  pulse = false,
  className = "",
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`mono inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${BADGE_TONES[tone]} ${pulse ? "pulse-ring" : ""} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <Badge tone="cyan" icon={<VerifiedIcon size={12} />}>
      Verified
    </Badge>
  );
}

export function FreeTonightBadge({ className = "" }: { className?: string }) {
  return (
    <Badge
      tone="amber"
      className={className}
      icon={<span className="blink h-1.5 w-1.5 rounded-full bg-amber-400" />}
    >
      Free tonight
    </Badge>
  );
}

export function UrgentBadge() {
  return (
    <Badge tone="amber-solid" pulse icon={<span className="text-[11px] leading-none">⚡</span>}>
      Urgent
    </Badge>
  );
}

// ----------------------------------------------------------------- buttons

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "sos";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-amber-500 text-ink-near hover:bg-amber-300 font-semibold shadow-[0_10px_30px_-12px_var(--accent)]",
  secondary:
    "bg-surface-800 text-text-hi hover:bg-surface-raised border border-hairline-strong font-medium",
  ghost: "bg-transparent text-text-mid hover:bg-surface-800 font-medium",
  danger:
    "bg-transparent text-[var(--color-danger)] border border-[color-mix(in_srgb,var(--color-danger)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] font-medium",
  sos: "bg-amber-500 text-ink-near hover:bg-amber-300 font-bold pulse-ring shadow-[0_10px_30px_-12px_var(--accent)]",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "px-3 py-2 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl min-h-[44px]",
    lg: "px-5 py-3 text-base rounded-xl min-h-[48px]",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-text-faint disabled:shadow-none ${sizes[size]} ${BUTTON_STYLES[variant]} ${className}`}
      {...rest}
    />
  );
}

// ------------------------------------------------------------------- cards

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-hairline-subtle bg-surface-900 ${
        onClick ? "cursor-pointer transition-colors hover:border-hairline-strong" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  action,
  className = "",
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <h2 className="mono text-[11px] font-bold text-text-lo">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline px-6 py-12 text-center">
      {icon && <div className="text-text-faint">{icon}</div>}
      <p className="font-medium text-text-hi">{title}</p>
      {body && <p className="max-w-sm text-sm text-text-lo">{body}</p>}
      {action}
    </div>
  );
}

// ---------------------------------------------------------- star ratings

/** static star row for a given rating (Uber-style, amber). */
export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-amber-500"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          size={size}
          filled={i <= Math.round(rating)}
          className={i <= Math.round(rating) ? "" : "text-hairline-strong"}
        />
      ))}
    </span>
  );
}

/** prominent "4.9 ★ · 127" rating readout used on profiles and cards. */
export function RatingNumber({
  avg,
  count,
  size = "md",
  className = "",
}: {
  avg: number;
  count: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const num = { sm: "text-sm", md: "text-base", lg: "text-3xl" }[size];
  const star = { sm: 12, md: 15, lg: 22 }[size];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`font-bold text-text-hi ${num}`}>{avg.toFixed(1)}</span>
      <StarIcon size={star} filled className="text-amber-500" />
      {count > 0 && (
        <span className="mono text-[11px] text-text-lo">({count})</span>
      )}
    </span>
  );
}

/** 5→1 star distribution bars. */
export function RatingBreakdown({
  breakdown,
  className = "",
}: {
  breakdown: [number, number, number, number, number];
  className?: string;
}) {
  const total = breakdown.reduce((s, n) => s + n, 0) || 1;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {breakdown.map((n, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="mono w-3 text-[10px] text-text-lo">{5 - i}</span>
          <StarIcon size={11} filled className="text-amber-500" />
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-800">
            <span
              className="block h-full rounded-full bg-amber-500"
              style={{ width: `${(n / total) * 100}%` }}
            />
          </span>
          <span className="mono w-8 text-right text-[10px] text-text-lo">{n}</span>
        </div>
      ))}
    </div>
  );
}

/** interactive 1..5 star input for post-gig rating. */
export function StarInput({
  value,
  onChange,
  size = 34,
}: {
  value: number;
  onChange: (stars: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rate this player">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={i === value}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          onClick={() => onChange(i)}
          className="rounded-full p-1 transition-transform hover:scale-110"
        >
          <StarIcon
            size={size}
            filled={i <= value}
            className={i <= value ? "text-amber-500" : "text-hairline-strong"}
          />
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ toggle

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:cursor-wait disabled:opacity-60 ${
        checked ? "border-transparent bg-amber-500" : "border-hairline-strong bg-surface-raised"
      }`}
    >
      {/* always-visible white knob: slides left (off) → right (on) */}
      <span
        className={`absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ------------------------------------------------------- modal / bottom sheet

export function Modal({
  open,
  onClose,
  children,
  title,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  width?: string;
}) {
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

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${width} max-h-[92vh] overflow-y-auto rounded-t-[26px] border border-hairline bg-surface-sheet p-5 pb-6 shadow-[0_-30px_60px_-30px_#000] sm:rounded-3xl sm:shadow-2xl rise`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* grabber (mobile sheet affordance) */}
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline-strong sm:hidden" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="text-lg font-semibold">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-text-lo hover:bg-surface-800 hover:text-text-hi"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ------------------------------------------------- little success check disc

export function SuccessCheck({ size = 56 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300"
      style={{ width: size, height: size }}
    >
      <CheckIcon size={size * 0.5} />
    </span>
  );
}

// -------------------------------------------------------------- formatting

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
