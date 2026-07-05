// Compact horizontal strip of bands with open slots, shown on Discover.
// Cards link to the band page; urgent slots (tonight!) get a red badge.

import { Link, useNavigate } from "react-router-dom";
import type { Band } from "../../lib/types";
import { instrument } from "../../lib/instruments";
import { Avatar, Card, SectionHeader, formatCount } from "../ui";
import { InstrumentIcon } from "../icons";

export function BandRecruitStrip({ bands }: { bands: Band[] }) {
  const navigate = useNavigate();
  if (bands.length === 0) return null;

  return (
    <section>
      <SectionHeader
        title="Bands recruiting near you"
        action={
          <Link
            to="/bands"
            className="text-xs font-medium text-amber-300 transition-colors hover:text-amber-200"
          >
            See all
          </Link>
        }
      />
      <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {bands.map((b) => (
          <Card
            key={b.id}
            onClick={() => navigate(`/b/${b.id}`)}
            className="w-64 shrink-0 p-3.5"
          >
            <div className="flex items-center gap-2.5">
              <Avatar name={b.name} seed={b.seed} size={38} square />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{b.name}</p>
                <p className="truncate text-[11px] text-zinc-500">
                  {b.genres.join(" · ")} · {formatCount(b.followers)} followers
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {b.openSlots.map((slot) => {
                const urgent = slot.note.toUpperCase().startsWith("URGENT");
                return (
                  <span
                    key={slot.instrument}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      urgent
                        ? "border-red-500/50 bg-red-500/10 text-red-300"
                        : "border-zinc-700/80 bg-zinc-900 text-zinc-300"
                    }`}
                  >
                    <InstrumentIcon instrument={slot.instrument} size={12} />
                    Needs {instrument(slot.instrument).short}
                    {urgent && <span className="font-bold">· tonight</span>}
                  </span>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
