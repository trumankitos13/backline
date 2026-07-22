// Shared building blocks for the profile surfaces (musician page + own profile).
// Backline tokens throughout — mono for data atoms, amber scarce, cyan for
// held/paid signals. The "Free tonight" badge lives in the foundation (ui.tsx).

import type { BookingStatus, InstrumentId, SkillLevel } from "../../lib/types";
import { instrument } from "../../lib/instruments";
import { CheckIcon, ClockIcon, CloseIcon, InstrumentIcon, LockIcon } from "../icons";
import { Badge, Chip } from "../ui";

const LEVEL_LABELS: Record<SkillLevel, string> = {
  pro: "Pro",
  "semi-pro": "Semi-pro",
  hobbyist: "Hobbyist",
};

/**
 * Instrument chips with icon + optional level/years.
 * Works for full Player entries and for the CurrentUser (ids only).
 */
export function InstrumentChips({
  instruments,
  className = "",
}: {
  instruments: { id: InstrumentId; level?: SkillLevel; years?: number }[];
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {instruments.map((ins) => (
        <Chip key={ins.id} active>
          <InstrumentIcon instrument={ins.id} size={14} />
          {instrument(ins.id).label}
          {ins.level && (
            <span className="font-normal text-amber-200/70">· {LEVEL_LABELS[ins.level]}</span>
          )}
          {ins.years !== undefined && (
            <span className="font-normal text-amber-200/70">· {ins.years} yrs</span>
          )}
        </Chip>
      ))}
    </div>
  );
}

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Mon–Sun strip with the usually-free days lit up (amber = the stage light). */
export function AvailabilityDays({ days }: { days: string[] }) {
  return (
    <div className="flex gap-1.5">
      {WEEK.map((d) => {
        const on = days.includes(d);
        return (
          <span
            key={d}
            className={`mono flex-1 rounded-lg border py-1.5 text-center text-[11px] font-bold ${
              on
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-hairline-subtle bg-surface-900 text-text-faint"
            }`}
          >
            {d}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Booking lifecycle pill — color is never the only signal, so each state pairs
 * a hue with an icon + word: offer (neutral), accepted (amber), held (cyan
 * lock), released (cyan check), declined (danger, outline).
 */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  switch (status) {
    case "offer":
      return (
        <Badge tone="neutral" icon={<ClockIcon size={11} />}>
          Offer sent
        </Badge>
      );
    case "accepted":
      return (
        <Badge tone="amber" icon={<CheckIcon size={11} />}>
          Accepted
        </Badge>
      );
    case "held":
      return (
        <Badge tone="cyan" icon={<LockIcon size={11} />}>
          Held
        </Badge>
      );
    case "disputed":
      return (
        <Badge tone="amber" icon={<ClockIcon size={11} />}>
          Under review
        </Badge>
      );
    case "released":
      return (
        <Badge tone="cyan" icon={<CheckIcon size={11} />}>
          Released
        </Badge>
      );
    case "refunded":
      return (
        <Badge tone="neutral" icon={<CloseIcon size={11} />}>
          Refunded
        </Badge>
      );
    case "paid":
      return (
        <Badge tone="cyan" icon={<LockIcon size={11} />}>
          Paid
        </Badge>
      );
    case "completed":
      return (
        <Badge tone="cyan" icon={<CheckIcon size={11} />}>
          Complete
        </Badge>
      );
    case "declined":
      return (
        <span className="mono inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-danger)]">
          <CloseIcon size={11} />
          Declined
        </span>
      );
    case "cancelled":
      return (
        <span className="mono inline-flex shrink-0 items-center gap-1.5 rounded-full border border-hairline-strong bg-surface-800 px-2.5 py-1 text-[10px] font-bold text-text-lo">
          <CloseIcon size={11} />
          Cancelled
        </span>
      );
  }
}
