// Small form primitives shared by the booking + payment sheets.

import type { ReactNode } from "react";

/** input/select/textarea base styles matching the dark theme */
export const inputCls =
  "w-full rounded-xl border border-zinc-700/80 bg-zinc-950/70 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-amber-400/70 focus:outline-none";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  /** right-aligned helper text, e.g. "Their rate: $120–$200" */
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
          {label}
        </span>
        {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
