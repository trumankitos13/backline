// Discover / find-a-player — the app's home screen. Client-side search, filters
// and sorting over the mock catalog, plus the SOS overlay for finding a sub for
// tonight (opened by the shell's SOS button via ?sos=open, or the in-page
// banner). Backline design system throughout.

import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Page } from "../components/shell";
import { useApp } from "../lib/store";
import { BANDS, MUSICIANS, bandsNeeding } from "../lib/data";
import { INSTRUMENTS, instrumentLabel } from "../lib/instruments";
import type { Band, InstrumentId, Musician } from "../lib/types";
import { Button, Chip, EmptyState, Mono, Toggle } from "../components/ui";
import {
  CloseIcon,
  InstrumentIcon,
  MapPinIcon,
  SearchIcon,
} from "../components/icons";
import { ReelViewer } from "../components/video";
import { SosBanner } from "../components/discover/SosBanner";
import { SosFlow } from "../components/discover/SosFlow";
import { MusicianCard } from "../components/discover/MusicianCard";
import { BandRecruitStrip } from "../components/discover/BandRecruitStrip";

type DistanceKey = "any" | "2" | "5";
type SortKey = "nearest" | "fastest" | "gigs" | "rate";

const DISTANCE_OPTIONS: { value: DistanceKey; label: string }[] = [
  { value: "any", label: "Any distance" },
  { value: "2", label: "< 2 mi" },
  { value: "5", label: "< 5 mi" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "nearest", label: "Nearest" },
  { value: "fastest", label: "Fastest reply" },
  { value: "gigs", label: "Most gigs" },
  { value: "rate", label: "Lowest rate" },
];

const SORTERS: Record<SortKey, (a: Musician, b: Musician) => number> = {
  nearest: (a, b) => a.distanceMiles - b.distanceMiles,
  fastest: (a, b) => a.responseMins - b.responseMins,
  gigs: (a, b) => b.gigsPlayed - a.gigsPlayed,
  rate: (a, b) => a.rate.min - b.rate.min,
};

const SELECT_CLASS =
  "mono rounded-lg border border-hairline-strong bg-surface-800 px-2.5 py-1.5 text-[11px] font-medium text-text-mid transition-colors hover:border-text-faint focus:border-amber-500 focus:outline-none";

export default function Discover() {
  const { state } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const sosOpen = searchParams.get("sos") === "open";

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InstrumentId[]>([]);
  const [tonightOnly, setTonightOnly] = useState(false);
  const [distance, setDistance] = useState<DistanceKey>("any");
  const [sort, setSort] = useState<SortKey>("nearest");
  const [reel, setReel] = useState<{ musician: Musician; index: number } | null>(null);

  function openSos() {
    const next = new URLSearchParams(searchParams);
    next.set("sos", "open");
    setSearchParams(next, { replace: true });
  }
  function closeSos() {
    const next = new URLSearchParams(searchParams);
    next.delete("sos");
    setSearchParams(next, { replace: true });
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = MUSICIANS.filter((m) => {
      if (tonightOnly && !m.availableTonight) return false;
      if (distance !== "any" && m.distanceMiles >= Number(distance)) return false;
      if (selected.length > 0 && !m.instruments.some((i) => selected.includes(i.id)))
        return false;
      if (q) {
        const hay = [
          m.name,
          m.handle,
          m.neighborhood,
          ...m.genres,
          ...m.instruments.map((i) => instrumentLabel(i.id)),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return list.sort(SORTERS[sort]);
  }, [query, selected, tonightOnly, distance, sort]);

  const tonightTotal = useMemo(
    () => MUSICIANS.filter((m) => m.availableTonight).length,
    [],
  );

  const recruitingBands = useMemo<Band[]>(() => {
    if (selected.length > 0) {
      const seen = new Set<string>();
      const out: Band[] = [];
      for (const id of selected) {
        for (const b of bandsNeeding(id)) {
          if (!seen.has(b.id)) {
            seen.add(b.id);
            out.push(b);
          }
        }
      }
      return out;
    }
    return BANDS.filter((b) => b.openSlots.length > 0);
  }, [selected]);

  const filtersActive =
    query.trim() !== "" || selected.length > 0 || tonightOnly || distance !== "any";

  function toggleInstrument(id: InstrumentId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function clearFilters() {
    setQuery("");
    setSelected([]);
    setTonightOnly(false);
    setDistance("any");
    setSort("nearest");
  }

  const neighborhood = state.user?.neighborhood ?? "East Austin";
  const firstBatch = results.slice(0, 3);
  const rest = results.slice(3);

  return (
    <Page>
      {/* header — mono kicker + neighborhood */}
      <header className="mb-5">
        <Mono className="text-[11px] font-bold text-text-lo">Your scene · Austin, TX</Mono>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-hi">Find a player</h1>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-mid">
          <MapPinIcon size={14} className="text-amber-500" />
          Near {neighborhood} — replies fast, plays hard
        </p>
      </header>

      <div className="space-y-4">
        <SosBanner tonightCount={tonightTotal} onOpen={openSos} />

        {/* search */}
        <div className="relative">
          <SearchIcon
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-lo"
          />
          <input
            type="text"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players, genres, instruments…"
            aria-label="Search players"
            className="w-full rounded-xl border border-hairline-strong bg-surface-900 py-2.5 pr-10 pl-10 text-sm text-text-hi transition-colors placeholder:text-text-lo focus:border-amber-500 focus:outline-none"
          />
          {query !== "" && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-text-lo transition-colors hover:bg-surface-800 hover:text-text-hi"
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>

        {/* instrument chips */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          {INSTRUMENTS.map((ins) => (
            <Chip
              key={ins.id}
              active={selected.includes(ins.id)}
              onClick={() => toggleInstrument(ins.id)}
            >
              <InstrumentIcon instrument={ins.id} size={14} />
              {ins.label}
            </Chip>
          ))}
        </div>

        {/* availability / distance / sort */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex items-center gap-2">
            <Toggle
              checked={tonightOnly}
              onChange={setTonightOnly}
              label="Available tonight"
            />
            <button
              onClick={() => setTonightOnly(!tonightOnly)}
              className={`text-sm font-medium transition-colors ${
                tonightOnly ? "text-amber-300" : "text-text-mid hover:text-text-hi"
              }`}
            >
              Free tonight
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={distance}
              onChange={(e) => setDistance(e.target.value as DistanceKey)}
              aria-label="Max distance"
              className={SELECT_CLASS}
            >
              {DISTANCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort by"
              className={SELECT_CLASS}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* result count + clear */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-text-lo">
            <Mono className="text-text-mid">{results.length}</Mono>{" "}
            {results.length === 1 ? "player" : "players"} near you
          </p>
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="mono text-[11px] font-bold text-amber-300 transition-colors hover:text-amber-200"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* results */}
        {results.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={30} />}
            title="No players match those filters"
            body="Try widening the distance, clearing an instrument, or turning off free-tonight — the Austin scene runs deeper than it looks."
            action={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {firstBatch.map((m) => (
              <MusicianCard
                key={m.id}
                musician={m}
                onOpenReel={(musician, index) => setReel({ musician, index })}
              />
            ))}
          </div>
        )}

        <BandRecruitStrip bands={recruitingBands} />

        {rest.length > 0 && (
          <div className="space-y-3">
            {rest.map((m) => (
              <MusicianCard
                key={m.id}
                musician={m}
                onOpenReel={(musician, index) => setReel({ musician, index })}
              />
            ))}
          </div>
        )}
      </div>

      {reel && (
        <ReelViewer
          clips={reel.musician.videos}
          startIndex={reel.index}
          ownerName={reel.musician.name}
          onClose={() => setReel(null)}
        />
      )}

      <SosFlow open={sosOpen} onClose={closeSos} />
    </Page>
  );
}
