// Shared UI primitives. Keep these dumb and presentational.

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { CloseIcon, StarIcon } from "./icons";

// ------------------------------------------------------------------ avatar

/** deterministic gradient pairs keyed by seed — stage-light palette */
const AVATAR_GRADIENTS = [
  ["#f59e0b", "#b45309"],
  ["#f97316", "#7c2d12"],
  ["#ef4444", "#7f1d1d"],
  ["#ec4899", "#831843"],
  ["#d946ef", "#701a75"],
  ["#8b5cf6", "#4c1d95"],
  ["#6366f1", "#312e81"],
  ["#3b82f6", "#1e3a8a"],
  ["#0ea5e9", "#0c4a6e"],
  ["#14b8a6", "#134e4a"],
  ["#10b981", "#064e3b"],
  ["#84cc16", "#3f6212"],
] as const;

export function avatarGradient(seed: number): [string, string] {
  const [a, b] = AVATAR_GRADIENTS[Math.abs(seed) % AVATAR_GRADIENTS.length];
  return [a, b];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Avatar({
  name,
  seed,
  size = 44,
  square = false,
  className = "",
}: {
  name: string;
  seed: number;
  size?: number;
  /** square-ish for bands/venues, round for people */
  square?: boolean;
  className?: string;
}) {
  const [from, to] = avatarGradient(seed);
  return (
    <div
      className={`flex shrink-0 items-center justify-center font-semibold text-white/95 ${
        square ? "rounded-xl" : "rounded-full"
      } ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.36),
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      aria-hidden="true"
    >
      {initials(name)}
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
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-amber-400/60 bg-amber-400/15 text-amber-300"
          : "border-zinc-700/80 bg-zinc-900 text-zinc-300"
      } ${onClick ? "cursor-pointer hover:border-zinc-500" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}

// ----------------------------------------------------------------- buttons

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-amber-400 text-zinc-950 hover:bg-amber-300 font-semibold shadow-[0_0_24px_-6px_rgba(251,191,36,0.55)]",
  secondary:
    "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700 font-medium",
  ghost: "bg-transparent text-zinc-300 hover:bg-zinc-800/70 font-medium",
  danger: "bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25 font-medium",
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
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-5 py-3 text-base rounded-xl",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${BUTTON_STYLES[variant]} ${className}`}
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
      className={`rounded-2xl border border-zinc-800/80 bg-zinc-900/60 ${
        onClick ? "cursor-pointer transition-colors hover:border-zinc-700 hover:bg-zinc-900" : ""
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
      <h2 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">{title}</h2>
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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">
      {icon && <div className="text-zinc-600">{icon}</div>}
      <p className="font-medium text-zinc-300">{title}</p>
      {body && <p className="max-w-sm text-sm text-zinc-500">{body}</p>}
      {action}
    </div>
  );
}

// ------------------------------------------------------------------- stars

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={size} filled={i <= Math.round(rating)} className={i <= Math.round(rating) ? "" : "text-zinc-700"} />
      ))}
    </span>
  );
}

// ------------------------------------------------------------------ toggle

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-emerald-500" : "bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ------------------------------------------------------------------- modal

export function Modal({
  open,
  onClose,
  children,
  title,
  /** max width utility, e.g. "max-w-md" */
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
        className={`w-full ${width} max-h-[92vh] overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:rounded-3xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="text-lg font-semibold">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
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
