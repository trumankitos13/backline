// Discover — the app's home "Reels" tab. A search field + toggleable filter
// chips over the mock catalog, then a 2-column grid of reel tiles (one per
// matching player, using their first reel). Tapping a tile plays the reel;
// tapping the footer opens the profile. Also owns the SOS overlay, opened by
// the shell's SOS button (?sos=open) or the in-page banner, and honours the
// SOS deep-link contract (?sos=open&role=<instrumentId>). Backline throughout.

import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Page } from "../components/shell";
import { useApp } from "../lib/store";
import { SCENES } from "../lib/scenes";
import { BANDS, PLAYERS, bandsNeeding } from "../lib/data";
import { instrument, instrumentLabel } from "../lib/instruments";
import type { Band, InstrumentId, Player } from "../lib/types";
import { Button, Chip, EmptyState, Mono } from "../components/ui";
import {
  CloseIcon,
  InstrumentIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  VerifiedIcon,
} from "../components/icons";
import { ReelViewer } from "../components/video";
import { SosBanner } from "../components/discover/SosBanner";
import { SosFlow } from "../components/discover/SosFlow";
import { PostFlow } from "../components/post/PostFlow";
import { AssembleFlow } from "../components/post/AssembleFlow";
import { ReelGridTile } from "../components/discover/ReelGridTile";
import { BandRecruitStrip } from "../components/discover/BandRecruitStrip";

/** the few instrument chips surfaced inline; the rest stay searchable by text. */
const CHIP_INSTRUMENTS: InstrumentId[] = ["drums", "keys", "guitar", "bass", "vocals"];

function isInstrumentId(v: string | null): v is InstrumentId {
  return v != null && CHIP_INSTRUMENTS.concat(
    "sax",
    "trumpet",
    "violin",
    "pedal-steel",
    "dj",
    "sound-tech",
    "lighting-tech",
  ).includes(v as InstrumentId);
}

export default function Discover() {
  const { state } = useApp();
  const sceneLabel = SCENES.find((scene) => scene.id === state.user?.scene)?.label ?? "Austin, TX";
  const [searchParams, setSearchParams] = useSearchParams();
  const sosOpen = searchParams.get("sos") === "open";
  const postOpen = searchParams.get("post") === "open";
  const assembleOpen = searchParams.get("assemble") === "open";
  const asParam = searchParams.get("as");
  const roleParam = searchParams.get("role");
  const openingParam = searchParams.get("opening");
  const sosRole: InstrumentId | null = isInstrumentId(roleParam) ? roleParam : null;

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InstrumentId[]>([]);
  const [tonightOnly, setTonightOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [near3, setNear3] = useState(false);
  const [reel, setReel] = useState<Player | null>(null);

  function openSos() {
    const next = new URLSearchParams(searchParams);
    next.set("sos", "open");
    setSearchParams(next, { replace: true });
  }
  function closeSos() {
    const next = new URLSearchParams(searchParams);
    next.delete("sos");
    next.delete("role");
    setSearchParams(next, { replace: true });
  }
  function openPost() {
    const next = new URLSearchParams(searchParams);
    next.set("post", "open");
    setSearchParams(next, { replace: true });
  }
  function closePost() {
    const next = new URLSearchParams(searchParams);
    next.delete("post");
    next.delete("as");
    next.delete("role");
    setSearchParams(next, { replace: true });
  }
  function openAssemble() {
    // swaps whatever sheet is up for the assemble flow
    setSearchParams(new URLSearchParams({ assemble: "open" }), { replace: true });
  }
  function closeAssemble() {
    const next = new URLSearchParams(searchParams);
    next.delete("assemble");
    setSearchParams(next, { replace: true });
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLAYERS.filter((p) => {
      if (tonightOnly && !p.availableTonight) return false;
      if (verifiedOnly && !p.verified) return false;
      if (near3 && p.distanceMiles >= 3) return false;
      if (selected.length > 0 && !p.instruments.some((i) => selected.includes(i.id)))
        return false;
      if (q) {
        const hay = [
          p.name,
          p.handle,
          p.neighborhood,
          ...p.genres,
          ...p.instruments.map((i) => instrumentLabel(i.id)),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => a.distanceMiles - b.distanceMiles);
  }, [query, selected, tonightOnly, verifiedOnly, near3]);

  const tonightTotal = useMemo(
    () => PLAYERS.filter((p) => p.availableTonight).length,
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
    query.trim() !== "" || selected.length > 0 || tonightOnly || verifiedOnly || near3;

  function toggleInstrument(id: InstrumentId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function clearFilters() {
    setQuery("");
    setSelected([]);
    setTonightOnly(false);
    setVerifiedOnly(false);
    setNear3(false);
  }

  return (
    <Page>
      {/* header — mono kicker + city */}
      <header className="mb-5">
        <Mono className="text-[11px] font-bold text-text-lo">Discover</Mono>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-hi">Reels near you</h1>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-text-mid">
          <MapPinIcon size={14} className="text-amber-500" />
          {sceneLabel} — tap a reel to watch, tap a name to book
        </p>
      </header>

      <div className="space-y-4">
        <SosBanner tonightCount={tonightTotal} onOpen={openSos} />

        {/* deliberate path: compose an opening "acting as" you / a band / a venue */}
        <button
          onClick={openPost}
          className="flex w-full items-center gap-3 rounded-2xl border border-hairline-strong bg-surface-900 px-4 py-3 text-left transition-colors hover:border-text-faint"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hairline-strong bg-surface-800 text-amber-300">
            <PlusIcon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-hi">Post an opening</p>
            <p className="truncate text-xs text-text-lo">
              Hire a player as yourself, a band, or a venue — the fee stays private.
            </p>
          </div>
          <span className="arrow-nudge shrink-0 text-text-lo" aria-hidden="true">
            →
          </span>
        </button>

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
            placeholder="Players, bands, venues near you"
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

        {/* filter chips — meta toggles + a few instruments */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          <Chip active={tonightOnly} onClick={() => setTonightOnly(!tonightOnly)}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${tonightOnly ? "blink bg-amber-400" : "bg-text-faint"}`}
            />
            Free tonight
          </Chip>
          <Chip active={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)}>
            <VerifiedIcon size={13} />
            Verified
          </Chip>
          <Chip active={near3} onClick={() => setNear3(!near3)}>
            <MapPinIcon size={13} />
            &lt; 3 mi
          </Chip>
          {CHIP_INSTRUMENTS.map((id) => (
            <Chip key={id} active={selected.includes(id)} onClick={() => toggleInstrument(id)}>
              <InstrumentIcon instrument={id} size={13} />
              {instrument(id).label}
            </Chip>
          ))}
        </div>

        {/* result count + clear */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-text-lo">
            <Mono className="text-text-mid">{results.length}</Mono>{" "}
            {results.length === 1 ? "reel" : "reels"} near you
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

        {/* reels grid */}
        {results.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={30} />}
            title="No reels match those filters"
            body={`Try clearing an instrument, widening the distance, or turning off free-tonight — the ${sceneLabel} scene runs deeper than it looks.`}
            action={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
            {results.map((p) => (
              <ReelGridTile key={p.id} player={p} onOpenReel={setReel} />
            ))}
          </div>
        )}

        {/* bands recruiting — below the grid */}
        <BandRecruitStrip bands={recruitingBands} />
      </div>

      {reel && (
        <ReelViewer
          clips={reel.videos}
          startIndex={0}
          ownerName={reel.name}
          onClose={() => setReel(null)}
        />
      )}

      <SosFlow
        open={sosOpen}
        initialRole={sosRole}
        initialOpeningId={openingParam}
        onClose={closeSos}
      />
      <PostFlow
        open={postOpen}
        initialContextId={asParam}
        initialRole={sosRole}
        onClose={closePost}
        onNewProject={openAssemble}
      />
      <AssembleFlow open={assembleOpen} onClose={closeAssemble} />
    </Page>
  );
}
