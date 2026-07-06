// /bands — the bands directory: open-slot recruiting board up top, all bands
// as cards, and a compact venues strip at the bottom.

import { Link, useNavigate } from "react-router-dom";
import { Page } from "../components/shell";
import { Avatar, Card, SectionHeader, formatCount } from "../components/ui";
import {
  BoltIcon,
  ChevronRightIcon,
  InstrumentIcon,
  MapPinIcon,
} from "../components/icons";
import {
  FollowButton,
  UrgentBadge,
  isUrgent,
  slotNoteText,
} from "../components/bands/shared";
import { BANDS, VENUES, getMusician } from "../lib/data";
import { instrumentLabel } from "../lib/instruments";
import type { Band, Musician } from "../lib/types";

interface SlotEntry {
  band: Band;
  slot: Band["openSlots"][number];
}

// every open slot across the scene, urgent SOS notes first
const OPEN_SLOTS: SlotEntry[] = BANDS.flatMap((band) =>
  band.openSlots.map((slot) => ({ band, slot })),
).sort((a, b) => Number(isUrgent(b.slot.note)) - Number(isUrgent(a.slot.note)));

function OpenSlotRow({ band, slot }: SlotEntry) {
  const urgent = isUrgent(slot.note);
  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        urgent
          ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-red-500/[0.07] to-transparent"
          : "border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={band.name} seed={band.seed} size={46} square />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold">{band.name}</p>
            {urgent && <UrgentBadge />}
          </div>
          <p
            className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${
              urgent ? "text-amber-300" : "text-zinc-300"
            }`}
          >
            <InstrumentIcon instrument={slot.instrument} size={16} />
            Needs {instrumentLabel(slot.instrument)}
          </p>
          <p
            className={`mt-1.5 text-sm leading-relaxed ${
              urgent ? "text-zinc-200" : "text-zinc-400"
            }`}
          >
            {slotNoteText(slot.note)}
          </p>
          <Link
            to={`/b/${band.id}`}
            className={`mt-2.5 inline-flex items-center gap-1 text-sm font-medium transition-colors ${
              urgent
                ? "text-amber-300 hover:text-amber-200"
                : "text-zinc-300 hover:text-amber-300"
            }`}
          >
            View band
            <ChevronRightIcon size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function BandCard({ band }: { band: Band }) {
  const navigate = useNavigate();
  const members = band.members
    .map((m) => getMusician(m.musicianId))
    .filter((m): m is Musician => Boolean(m));

  return (
    <Card onClick={() => navigate(`/b/${band.id}`)} className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={band.name} seed={band.seed} size={52} square />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{band.name}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-400">
                {band.genres.join(" · ")}
              </p>
            </div>
            <FollowButton id={band.id} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="flex -space-x-1.5">
                {members.slice(0, 4).map((m) => (
                  <Avatar
                    key={m.id}
                    name={m.name}
                    seed={m.seed}
                    size={18}
                    className="ring-2 ring-zinc-950"
                  />
                ))}
              </span>
              {band.members.length} members
            </span>
            <span className="flex items-center gap-1">
              <MapPinIcon size={13} />
              {band.neighborhood}
            </span>
            <span>{formatCount(band.followers)} followers</span>
          </div>
          {band.openSlots.length > 0 && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-300/90">
              <BoltIcon size={13} />
              {band.openSlots.length === 1
                ? "1 open slot"
                : `${band.openSlots.length} open slots`}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Bands() {
  return (
    <Page
      title="Bands & groups"
      subtitle="Find your people — or be the missing piece of someone else's."
    >
      {/* --------------------------------------------- open slots board */}
      <SectionHeader
        title="Open slots right now"
        className="mb-3"
        action={
          <span className="text-xs text-zinc-500">
            {OPEN_SLOTS.length} across the scene
          </span>
        }
      />
      <div className="flex flex-col gap-3">
        {OPEN_SLOTS.map(({ band, slot }) => (
          <OpenSlotRow key={`${band.id}-${slot.instrument}`} band={band} slot={slot} />
        ))}
      </div>

      {/* ------------------------------------------------------ directory */}
      <SectionHeader
        title="All bands"
        className="mt-8 mb-3"
        action={<span className="text-xs text-zinc-500">{BANDS.length} in Austin</span>}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {BANDS.map((band) => (
          <BandCard key={band.id} band={band} />
        ))}
      </div>

      {/* --------------------------------------------------- venues strip */}
      <SectionHeader
        title="Venues"
        className="mt-8 mb-3"
        action={
          <span className="text-xs text-zinc-500">rooms that book through Backline</span>
        }
      />
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {VENUES.map((v) => (
          <Link
            key={v.id}
            to={`/v/${v.id}`}
            className="block w-60 shrink-0 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <Avatar name={v.name} seed={v.seed} size={40} square />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{v.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {v.neighborhood} · cap {formatCount(v.capacity)}
                </p>
              </div>
            </div>
            <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
              {v.vibe}
            </p>
          </Link>
        ))}
      </div>
    </Page>
  );
}
