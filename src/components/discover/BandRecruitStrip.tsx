// Horizontal rail of bands with open slots — the mobile entry point into Bands.
// The header links to /bands; each card is clearly tappable through to /b/:id.
// Urgent (tonight!) slots read amber; ordinary open slots stay neutral.

import { Link, useNavigate } from "react-router-dom";
import type { Band } from "../../lib/types";
import { instrument } from "../../lib/instruments";
import { Avatar, Card, Mono, SectionHeader, formatCount } from "../ui";
import { ChevronRightIcon, InstrumentIcon } from "../icons";

export function BandRecruitStrip({ bands }: { bands: Band[] }) {
  const navigate = useNavigate();
  if (bands.length === 0) return null;

  return (
    <section>
      <SectionHeader
        title="Bands recruiting"
        action={
          <Link
            to="/bands"
            className="mono inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-300 transition-colors hover:text-amber-200"
          >
            All bands
            <ChevronRightIcon size={13} />
          </Link>
        }
      />
      <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {bands.map((b) => (
          <Card
            key={b.id}
            onClick={() => navigate(`/b/${b.id}`)}
            className="flex w-64 shrink-0 flex-col p-3.5"
          >
            <div className="flex items-center gap-2.5">
              <Avatar name={b.name} seed={b.seed} size={38} square />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-hi">{b.name}</p>
                <Mono className="block truncate text-[10px] text-text-lo">
                  {formatCount(b.followers)} followers
                </Mono>
              </div>
              <ChevronRightIcon size={16} className="shrink-0 text-text-faint" />
            </div>

            <p className="mt-1.5 truncate text-[11px] text-text-mid">
              {b.genres.join(" · ")}
            </p>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {b.openSlots.map((slot) => {
                const urgent = slot.note.toUpperCase().startsWith("URGENT");
                return (
                  <span
                    key={slot.instrument}
                    className={`mono inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      urgent
                        ? "border-transparent bg-amber-500 text-ink-near"
                        : "border-hairline-strong bg-surface-800 text-text-mid"
                    }`}
                  >
                    <InstrumentIcon instrument={slot.instrument} size={12} />
                    Needs {instrument(slot.instrument).short}
                    {urgent && <span>· tonight</span>}
                  </span>
                );
              })}
            </div>

            <Mono className="mt-3 inline-flex items-center gap-1 text-[10px] text-text-lo">
              Tap to view band
              <ChevronRightIcon size={12} className="arrow-nudge" />
            </Mono>
          </Card>
        ))}
      </div>
    </section>
  );
}
