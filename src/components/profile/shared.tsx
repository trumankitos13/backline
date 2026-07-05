// Shared building blocks for the profile surfaces (musician page + own profile).

import type { BookingStatus, InstrumentId, SkillLevel } from "../../lib/types";
import { instrument } from "../../lib/instruments";
import { InstrumentIcon } from "../icons";
import { Chip } from "../ui";

const LEVEL_LABELS: Record<SkillLevel, string> = {
  pro: "Pro",
  "semi-pro": "Semi-pro",
  hobbyist: "Hobbyist",
};

/**
 * Instrument chips with icon + optional level/years.
 * Works for full Musician entries and for the CurrentUser (ids only).
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

/** Emerald "Free tonight" badge with the pulsing live dot. */
export function FreeTonightBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 shadow-[0_0_16px_-6px_rgba(16,185,129,0.9)] ${className}`}
    >
      <span className="glow-pulse h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.7)]" />
      Free tonight
    </span>
  );
}

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Mon–Sun strip with the usually-free days lit up. */
export function AvailabilityDays({ days }: { days: string[] }) {
  return (
    <div className="flex gap-1.5">
      {WEEK.map((d) => {
        const on = days.includes(d);
        return (
          <span
            key={d}
            className={`flex-1 rounded-lg border py-1.5 text-center text-[11px] font-medium ${
              on
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-600"
            }`}
          >
            {d}
          </span>
        );
      })}
    </div>
  );
}

const STATUS_STYLES: Record<BookingStatus, { label: string; className: string }> = {
  offer: { label: "Offer sent", className: "border-zinc-700 bg-zinc-800/80 text-zinc-300" },
  accepted: { label: "Accepted", className: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  paid: { label: "Paid", className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" },
  declined: { label: "Declined", className: "border-red-500/40 bg-red-500/10 text-red-300" },
};

/** Booking lifecycle pill: offer → accepted → paid (declined for completeness). */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.className}`}
    >
      {s.label}
    </span>
  );
}
