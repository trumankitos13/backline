// Small form primitives shared by the booking + payment sheets.

import type { ReactNode } from "react";

/** input/select/textarea base styles — Backline tokens, recessed on sheets */
export const inputCls =
  "w-full rounded-xl border border-hairline-strong bg-ink-near px-3.5 py-2.5 text-sm text-text-hi placeholder:text-text-faint transition-colors focus:border-amber-500/70 focus:outline-none";

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
        <span className="mono text-[11px] font-bold text-text-lo">{label}</span>
        {hint && <span className="mono text-[10px] text-text-lo">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
