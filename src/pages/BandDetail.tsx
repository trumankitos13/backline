// /b/:id — band page: header + bio, members (with "free tonight" markers),
// open slots with the "I can cover this" fast path into messages, and gigs.

import { Link, useNavigate, useParams } from "react-router-dom";
import { Page } from "../components/shell";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  SectionHeader,
  formatCount,
} from "../components/ui";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  InstrumentIcon,
  MapPinIcon,
  ShareIcon,
  UsersIcon,
  VerifiedIcon,
} from "../components/icons";
import {
  FollowButton,
  GigRow,
  UrgentBadge,
  isUrgent,
  slotNoteText,
} from "../components/bands/shared";
import { getBand, getGig, getMusician } from "../lib/data";
import { instrumentLabel } from "../lib/instruments";
import type { Gig, InstrumentId } from "../lib/types";

export default function BandDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const band = id ? getBand(id) : undefined;

  if (!band) {
    return (
      <Page title="Band not found">
        <EmptyState
          icon={<UsersIcon size={32} />}
          title="This band isn't on SitIn"
          body="Maybe they changed their name, maybe they broke up over a setlist. Either way, plenty of other groups are looking for players."
          action={
            <Link to="/bands">
              <Button variant="secondary">Back to bands</Button>
            </Link>
          }
        />
      </Page>
    );
  }

  const firstMemberId = band.members[0]?.musicianId;
  const gigs = band.gigIds
    .map((gid) => getGig(gid))
    .filter((g): g is Gig => Boolean(g));

  const coverSlot = (instrumentId: InstrumentId) => {
    if (!firstMemberId) return;
    navigate(`/messages/c-${firstMemberId}`, {
      state: {
        prefill: `Hey! Saw ${band.name} needs ${instrumentLabel(instrumentId)} — I'm available. What's the set?`,
      },
    });
  };

  return (
    <Page>
      <Link
        to="/bands"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <ArrowLeftIcon size={16} />
        Bands
      </Link>

      {/* ------------------------------------------------------- header */}
      <div className="flex items-start gap-4">
        <Avatar name={band.name} seed={band.seed} size={84} square />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{band.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">{band.genres.join(" · ")}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <MapPinIcon size={13} />
              {band.neighborhood}
            </span>
            <span>
              <span className="font-semibold text-zinc-300">
                {formatCount(band.followers)}
              </span>{" "}
              followers
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <FollowButton id={band.id} size="md" className="w-full sm:w-auto sm:min-w-44" />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-zinc-300">{band.bio}</p>

      {/* ------------------------------------------------------ members */}
      <SectionHeader
        title="Members"
        className="mt-8 mb-3"
        action={<span className="text-xs text-zinc-500">{band.members.length} in the lineup</span>}
      />
      <Card className="divide-y divide-zinc-800/70">
        {band.members.map(({ musicianId, role }) => {
          const m = getMusician(musicianId);
          if (!m) return null;
          return (
            <Link
              key={musicianId}
              to={`/m/${musicianId}`}
              className="flex items-center gap-3 p-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-zinc-900"
            >
              <Avatar name={m.name} seed={m.seed} size={42} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{m.name}</span>
                  {m.verified && <VerifiedIcon size={14} />}
                </p>
                <p className="truncate text-xs text-zinc-500">{role}</p>
              </div>
              {m.availableTonight && (
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                  <span className="glow-pulse h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Free tonight
                </span>
              )}
              <ChevronRightIcon size={16} className="shrink-0 text-zinc-600" />
            </Link>
          );
        })}
      </Card>

      {/* --------------------------------------------------- open slots */}
      <SectionHeader
        title="Open slots"
        className="mt-8 mb-3"
        action={
          band.openSlots.length > 0 ? (
            <span className="text-xs text-amber-300/90">
              {band.openSlots.length} open
            </span>
          ) : undefined
        }
      />
      {band.openSlots.length > 0 ? (
        <div className="flex flex-col gap-3">
          {band.openSlots.map((slot) => {
            const urgent = isUrgent(slot.note);
            return (
              <div
                key={slot.instrument}
                className={`rounded-2xl border p-4 ${
                  urgent
                    ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-red-500/[0.07] to-transparent"
                    : "border-zinc-800/80 bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      urgent
                        ? "bg-amber-400/15 text-amber-300"
                        : "bg-zinc-800/80 text-zinc-300"
                    }`}
                  >
                    <InstrumentIcon instrument={slot.instrument} size={20} />
                  </span>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    Needs {instrumentLabel(slot.instrument)}
                    {urgent && <UrgentBadge />}
                  </p>
                </div>
                <p
                  className={`mt-2.5 text-sm leading-relaxed ${
                    urgent ? "text-zinc-200" : "text-zinc-400"
                  }`}
                >
                  {slotNoteText(slot.note)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => coverSlot(slot.instrument)}
                    className="flex-1 sm:flex-none"
                  >
                    I can cover this
                  </Button>
                  <Button size="sm" variant="ghost">
                    <ShareIcon size={14} />
                    Share
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Full lineup right now — follow {band.name} to hear when that changes.
        </p>
      )}

      {/* ------------------------------------------------- upcoming gigs */}
      <SectionHeader title="Upcoming gigs" className="mt-8 mb-3" />
      {gigs.length > 0 ? (
        <div className="flex flex-col gap-3">
          {gigs.map((gig) => (
            <Card key={gig.id}>
              <GigRow gig={gig} link="venue" />
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No dates on the books"
          body={`When ${band.name} announces a show, it lands here and in your feed.`}
        />
      )}
    </Page>
  );
}
