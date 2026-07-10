// /bands — the bands directory: open-slot recruiting board up top, all bands
// as cards, and a compact venues strip at the bottom.

import { Link, useNavigate } from "react-router-dom";
import { Page } from "../components/shell";
import {
  Avatar,
  Card,
  Chip,
  Mono,
  SectionHeader,
  UrgentBadge,
  formatCount,
} from "../components/ui";
import {
  BoltIcon,
  ChevronRightIcon,
  InstrumentIcon,
  MapPinIcon,
} from "../components/icons";
import { FollowButton, isUrgent, slotNoteText } from "../components/bands/shared";
import { BANDS, VENUES, getPlayer } from "../lib/data";
import { instrumentLabel } from "../lib/instruments";
import type { Band, Player } from "../lib/types";

interface SlotEntry {
  band: Band;
  slot: Band["openSlots"][number];
}

// every open slot across the scene, urgent SOS notes first
const OPEN_SLOTS: SlotEntry[] = BANDS.flatMap((band) =>
  band.openSlots.map((slot) => ({ band, slot })),
).sort((a, b) => Number(isUrgent(b.slot.note)) - Number(isUrgent(a.slot.note)));

function OpenSlotCard({ band, slot }: SlotEntry) {
  const navigate = useNavigate();
  const urgent = isUrgent(slot.note);
  return (
    <Card
      onClick={() => navigate(`/b/${band.id}`)}
      className={`p-4 ${
        urgent
          ? "border-amber-500/45 bg-gradient-to-br from-amber-500/12 via-amber-500/[0.04] to-transparent hover:border-amber-500/70"
          : ""
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
              urgent ? "text-amber-300" : "text-text-mid"
            }`}
          >
            <InstrumentIcon instrument={slot.instrument} size={16} />
            Needs {instrumentLabel(slot.instrument)}
          </p>
          <p
            className={`mt-1.5 text-sm leading-relaxed ${
              urgent ? "text-text-hi" : "text-text-mid"
            }`}
          >
            {slotNoteText(slot.note)}
          </p>
          <span
            className={`mt-2.5 inline-flex items-center gap-1 text-sm font-medium ${
              urgent ? "text-amber-300" : "text-text-mid"
            }`}
          >
            View band
            <ChevronRightIcon size={14} />
          </span>
        </div>
      </div>
    </Card>
  );
}

function BandCard({ band }: { band: Band }) {
  const navigate = useNavigate();
  const members = band.members
    .map((m) => getPlayer(m.playerId))
    .filter((m): m is Player => Boolean(m));

  return (
    <Card onClick={() => navigate(`/b/${band.id}`)} className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={band.name} seed={band.seed} size={52} square />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate font-semibold">{band.name}</p>
            <FollowButton id={band.id} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {band.genres.map((g) => (
              <Chip key={g}>{g}</Chip>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-lo">
            <span className="flex items-center gap-1.5">
              <span className="flex -space-x-1.5">
                {members.slice(0, 4).map((m) => (
                  <Avatar
                    key={m.id}
                    name={m.name}
                    seed={m.seed}
                    size={18}
                    className="ring-2 ring-surface-900"
                  />
                ))}
              </span>
              <Mono className="text-[10px] text-text-mid">{band.members.length}</Mono>
              members
            </span>
            <span className="flex items-center gap-1">
              <MapPinIcon size={13} />
              {band.neighborhood}
            </span>
            <span className="flex items-center gap-1">
              <Mono className="text-[10px] text-text-mid">{formatCount(band.followers)}</Mono>
              followers
            </span>
          </div>
          {band.openSlots.length > 0 && (
            <p className="mt-2.5 flex items-center gap-1 text-xs font-medium text-amber-300">
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
          <Mono className="text-[10px] text-text-lo">
            {OPEN_SLOTS.length} across the scene
          </Mono>
        }
      />
      <div className="flex flex-col gap-3">
        {OPEN_SLOTS.map(({ band, slot }) => (
          <OpenSlotCard key={`${band.id}-${slot.instrument}`} band={band} slot={slot} />
        ))}
      </div>

      {/* ------------------------------------------------------ directory */}
      <SectionHeader
        title="All bands"
        className="mt-8 mb-3"
        action={<Mono className="text-[10px] text-text-lo">{BANDS.length} in Austin</Mono>}
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
          <Mono className="text-[10px] text-text-lo">rooms that book here</Mono>
        }
      />
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {VENUES.map((v) => (
          <Link
            key={v.id}
            to={`/v/${v.id}`}
            className="block w-60 shrink-0 rounded-2xl border border-hairline-subtle bg-surface-900 p-4 transition-colors hover:border-hairline-strong"
          >
            <div className="flex items-center gap-3">
              <Avatar name={v.name} seed={v.seed} size={40} square />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{v.name}</p>
                <p className="truncate text-xs text-text-lo">
                  {v.neighborhood} · <Mono className="text-[10px]">cap {formatCount(v.capacity)}</Mono>
                </p>
              </div>
            </div>
            <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-text-mid">
              {v.vibe}
            </p>
          </Link>
        ))}
      </div>
    </Page>
  );
}
