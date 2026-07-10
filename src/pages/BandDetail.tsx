// /b/:id — band page: header + bio, members (with "free tonight" markers),
// open slots with the "I can cover this" fast path into messages, and gigs.

import { Link, useNavigate, useParams } from "react-router-dom";
import { Page } from "../components/shell";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Mono,
  SectionHeader,
  UrgentBadge,
  formatCount,
} from "../components/ui";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  InstrumentIcon,
  MapPinIcon,
  PlusIcon,
  ShareIcon,
  UsersIcon,
  VerifiedIcon,
} from "../components/icons";
import {
  FindSubButton,
  FollowButton,
  GigRow,
  isUrgent,
  slotNoteText,
  sosHref,
} from "../components/bands/shared";
import { LinksSection } from "../components/links";
import { getBand, getEvent, getPlayer } from "../lib/data";
import { myActingContexts } from "../lib/actingAs";
import { useApp } from "../lib/store";
import { instrumentLabel } from "../lib/instruments";
import type { Event, InstrumentId } from "../lib/types";

export default function BandDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useApp();
  // catalog bands + user-created projects share this page
  const project = id ? state.projects.find((p) => p.id === id) : undefined;
  const band = project ?? (id ? getBand(id) : undefined);
  const isProject = Boolean(project);

  if (!band) {
    return (
      <Page title="Band not found">
        <EmptyState
          icon={<UsersIcon size={32} />}
          title="This band isn't on Backline"
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

  const firstMemberId = band.members[0]?.playerId;
  // the user can post *as this band* only if they admin it (capabilities model).
  const canPostAs = myActingContexts(state.user, state.projects).some(
    (c) => c.id === band.id,
  );
  const gigs = band.eventIds
    .map((gid) => getEvent(gid))
    .filter((g): g is Event => Boolean(g));
  // project seats live as Openings posted by the project
  const seats = state.openings.filter((o) => o.postedBy.id === band.id);

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
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-mid transition-colors hover:text-text-hi"
      >
        <ArrowLeftIcon size={16} />
        Bands
      </Link>

      {/* ------------------------------------------------------- header */}
      <div className="flex items-start gap-4">
        <Avatar name={band.name} seed={band.seed} size={84} square />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{band.name}</h1>
          {isProject && (
            <Mono
              className={`mt-1.5 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                band.archived
                  ? "border-hairline-strong text-text-lo"
                  : band.kind === "standing"
                    ? "border-amber-500/45 bg-amber-500/10 text-amber-300"
                    : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
              }`}
            >
              {band.archived
                ? "Archived project"
                : band.kind === "standing"
                  ? "Standing band"
                  : "Pickup project"}
            </Mono>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {band.genres.map((g) => (
              <Chip key={g}>{g}</Chip>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-lo">
            <span className="flex items-center gap-1">
              <MapPinIcon size={13} />
              {band.neighborhood}
            </span>
            {!isProject && (
              <span className="flex items-center gap-1">
                <Mono className="text-[10px] text-text-mid">{formatCount(band.followers)}</Mono>
                followers
              </span>
            )}
          </div>
        </div>
      </div>

      {!isProject && (
        <div className="mt-4">
          <FollowButton id={band.id} size="md" className="w-full sm:w-auto sm:min-w-44" />
        </div>
      )}

      {band.bio && <p className="mt-4 text-sm leading-relaxed text-text-mid">{band.bio}</p>}

      {/* ------------------------------------------------------ members */}
      <SectionHeader
        title="Members"
        className="mt-8 mb-3"
        action={<Mono className="text-[10px] text-text-lo">{band.members.length} in the lineup</Mono>}
      />
      <Card className="divide-y divide-hairline-subtle">
        {band.members.map(({ playerId, role, performing }) => {
          // "me" = the signed-in user on their own project roster
          if (playerId === "me") {
            return (
              <Link
                key={playerId}
                to="/profile"
                className="flex items-center gap-3 p-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface-850"
              >
                <Avatar name={state.user?.name ?? "You"} seed={99} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {state.user?.name ?? "You"}{" "}
                    <Mono className="text-[10px] text-amber-300">· you</Mono>
                  </p>
                  <p className="truncate text-xs text-text-lo">
                    {role}
                    {performing === false && " · not performing"}
                  </p>
                </div>
                <ChevronRightIcon size={16} className="shrink-0 text-text-faint" />
              </Link>
            );
          }
          const m = getPlayer(playerId);
          if (!m) return null;
          return (
            <Link
              key={playerId}
              to={`/m/${playerId}`}
              className="flex items-center gap-3 p-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface-850"
            >
              <Avatar name={m.name} seed={m.seed} size={42} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">{m.name}</span>
                  {m.verified && <VerifiedIcon size={14} />}
                </p>
                <p className="truncate text-xs text-text-lo">{role}</p>
              </div>
              {m.availableTonight && (
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-amber-300">
                  <span className="blink h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Free tonight
                </span>
              )}
              <ChevronRightIcon size={16} className="shrink-0 text-text-faint" />
            </Link>
          );
        })}
      </Card>

      {/* ---------------------------------------- project seats (openings) */}
      {isProject && (
        <>
          <SectionHeader
            title="Seats"
            className="mt-8 mb-3"
            action={
              seats.length > 0 ? (
                <Mono className="text-[10px] text-cyan-300">
                  {seats.filter((s) => s.status === "filled").length}/{seats.length} locked
                </Mono>
              ) : undefined
            }
          />
          {seats.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {seats.map((seat) => {
                const filledBy = state.bookings.find(
                  (b) => b.openingId === seat.id && (b.status === "held" || b.status === "released"),
                );
                const player = filledBy ? getPlayer(filledBy.playerId) : undefined;
                return seat.status === "filled" && player ? (
                  <Card key={seat.id} className="flex items-center gap-3 p-3.5">
                    <Avatar name={player.name} seed={player.seed} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{player.name}</p>
                      <Mono className="text-[10px] text-text-lo">
                        {instrumentLabel(seat.instrument)}
                      </Mono>
                    </div>
                    <Mono className="mono inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold text-cyan-300">
                      🔒 Locked in
                    </Mono>
                  </Card>
                ) : (
                  <div
                    key={seat.id}
                    className="flex items-center gap-3 rounded-2xl border border-dashed border-hairline-strong bg-surface-900/40 p-3.5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-hairline-strong bg-surface-800/60 text-text-mid">
                      <InstrumentIcon instrument={seat.instrument} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {instrumentLabel(seat.instrument)}
                        <span className="text-text-lo"> — open</span>
                      </p>
                      <Mono className="text-[10px] text-text-lo">{seat.when}</Mono>
                    </div>
                    {canPostAs && seat.status === "open" && (
                      <Button
                        size="sm"
                        onClick={() => navigate(sosHref(seat.instrument, seat.id))}
                      >
                        Fill this seat
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-text-lo">No seats posted yet.</p>
          )}
        </>
      )}

      {/* --------------------------------------------------- open seats */}
      {!isProject && (
      <>
      <SectionHeader
        title="Open seats"
        className="mt-8 mb-3"
        action={
          band.openSlots.length > 0 ? (
            <Mono className="text-[10px] text-amber-300">{band.openSlots.length} open</Mono>
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
                className={`rounded-2xl border border-dashed p-4 ${
                  urgent
                    ? "border-amber-500/60 bg-gradient-to-br from-amber-500/12 via-amber-500/[0.04] to-transparent"
                    : "border-hairline-strong bg-surface-900/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed ${
                      urgent
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                        : "border-hairline-strong bg-surface-800/60 text-text-mid"
                    }`}
                  >
                    <InstrumentIcon instrument={slot.instrument} size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {instrumentLabel(slot.instrument)}
                      <span className="text-text-lo">— seat open</span>
                      {urgent && <UrgentBadge />}
                    </p>
                  </div>
                </div>
                <p
                  className={`mt-2.5 text-sm leading-relaxed ${
                    urgent ? "text-text-hi" : "text-text-mid"
                  }`}
                >
                  {slotNoteText(slot.note)}
                </p>
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <FindSubButton instrument={slot.instrument} size="sm" />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => coverSlot(slot.instrument)}
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
        <p className="text-sm text-text-lo">
          Full lineup right now — follow {band.name} to hear when that changes.
        </p>
      )}
      </>
      )}

      {/* post an opening as this band — only for admins (capabilities model) */}
      {canPostAs && (
        <Button
          className="mt-3 w-full"
          onClick={() => navigate(`/?post=open&as=${band.id}`)}
        >
          <PlusIcon size={16} />
          Post an opening as {band.name}
        </Button>
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

      <LinksSection links={band.links} title="Band links" className="mt-8" />
    </Page>
  );
}
