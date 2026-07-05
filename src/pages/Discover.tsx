// Discover / find-a-player — the app's home screen.
// Client-side search, filters, and sorting over the mock musician catalog,
// plus the headline "SOS mode" flow for finding a sub for tonight.

import { useMemo, useState } from "react";
import { Page } from "../components/shell";
import { useApp } from "../lib/store";
import { BANDS, MUSICIANS, bandsNeeding } from "../lib/data";
import { INSTRUMENTS, instrumentLabel } from "../lib/instruments";
import type { Band, InstrumentId, Musician } from "../lib/types";
import { Button, Chip, EmptyState, Toggle } from "../components/ui";
import {
  CloseIcon,
  InstrumentIcon,
  MapPinIcon,
  SearchIcon,
} from "../components/icons";
import { ReelViewer } from "../components/video";
import { SosBanner } from "../components/discover/SosBanner";
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
  "rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 focus:border-amber-400/60 focus:outline-none";

export default function Discover() {
  const { state } = useApp();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InstrumentId[]>([]);
  const [tonightOnly, setTonightOnly] = useState(false);
  const [distance, setDistance] = useState<DistanceKey>("any");
  const [sort, setSort] = useState<SortKey>("nearest");
  const [sos, setSos] = useState(false);
  const [reel, setReel] = useState<{ musician: Musician; index: number } | null>(null);

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

  const fastestMins =
    results.length > 0 ? Math.min(...results.map((m) => m.responseMins)) : null;

  function toggleInstrument(id: InstrumentId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function activateSos() {
    setSos(true);
    setTonightOnly(true);
    setSort("fastest");
  }

  function dismissSos() {
    setSos(false);
    setTonightOnly(false);
    setSort("nearest");
  }

  function handleTonightToggle(next: boolean) {
    setTonightOnly(next);
    if (!next) setSos(false); // SOS without "tonight" makes no sense
  }

  function clearFilters() {
    setQuery("");
    setSelected([]);
    setTonightOnly(false);
    setDistance("any");
    setSort("nearest");
    setSos(false);
  }

  const firstBatch = results.slice(0, 3);
  const rest = results.slice(3);

  return (
    <Page
      title="Find a player"
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          <MapPinIcon size={14} className="text-amber-400" />
          Near {state.user?.neighborhood ?? "East Austin"} · Austin, TX
        </span>
      }
    >
      <div className="space-y-4">
        <SosBanner
          active={sos}
          count={results.length}
          fastestMins={fastestMins}
          tonightTotal={tonightTotal}
          onActivate={activateSos}
          onDismiss={dismissSos}
        />

        {/* search */}
        <div className="relative">
          <SearchIcon
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players, genres, instruments…"
            aria-label="Search players"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 pr-10 pl-10 text-sm text-zinc-100 transition-colors placeholder:text-zinc-500 focus:border-amber-400/60 focus:outline-none"
          />
          {query !== "" && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
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
              onChange={handleTonightToggle}
              label="Available tonight"
            />
            <button
              onClick={() => handleTonightToggle(!tonightOnly)}
              className={`text-sm font-medium transition-colors ${
                tonightOnly ? "text-emerald-300" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Available tonight
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
          <p className="text-xs text-zinc-500">
            {results.length} {results.length === 1 ? "player" : "players"}
            {sos ? " ready to cover tonight" : " near you"}
          </p>
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-amber-300 transition-colors hover:text-amber-200"
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
            body="Try widening the distance, clearing an instrument, or turning off tonight-only — the Austin scene runs deeper than it looks."
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
                highlight={sos && m.availableTonight}
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
                highlight={sos && m.availableTonight}
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
    </Page>
  );
}
