// /v/:id — venue page: header + vibe, upcoming calendar with band
// cross-links, and a short "how booking works here" card.

import { Link, useParams } from "react-router-dom";
import { Page } from "../components/shell";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Mono,
  SectionHeader,
  formatCount,
} from "../components/ui";
import {
  ArrowLeftIcon,
  CheckIcon,
  InstrumentIcon,
  MapPinIcon,
  SendIcon,
  UsersIcon,
} from "../components/icons";
import { FindSubButton, FollowButton, GigRow } from "../components/bands/shared";
import { LinksSection } from "../components/links";
import { EVENTS, getVenue } from "../lib/data";
import { instrumentLabel } from "../lib/instruments";

export default function VenueDetail() {
  const { id } = useParams<{ id: string }>();
  const venue = id ? getVenue(id) : undefined;

  if (!venue) {
    return (
      <Page title="Venue not found">
        <EmptyState
          icon={<MapPinIcon size={32} />}
          title="This room isn't on Backline"
          body="The link may be stale — venues turn into coffee shops fast around here. The ones still pouring drinks are on the bands page."
          action={
            <Link to="/bands">
              <Button variant="secondary">Browse bands & venues</Button>
            </Link>
          }
        />
      </Page>
    );
  }

  const gigs = EVENTS.filter((g) => g.venueId === venue.id);

  return (
    <Page>
      <Link
        to="/bands"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-mid transition-colors hover:text-text-hi"
      >
        <ArrowLeftIcon size={16} />
        Bands & venues
      </Link>

      {/* ------------------------------------------------------- header */}
      <div className="flex items-start gap-4">
        <Avatar name={venue.name} seed={venue.seed} size={84} square />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{venue.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-lo">
            <span className="flex items-center gap-1">
              <MapPinIcon size={13} />
              {venue.neighborhood}
            </span>
            <span className="flex items-center gap-1">
              <UsersIcon size={13} />
              <Mono className="text-[10px] text-text-mid">cap {formatCount(venue.capacity)}</Mono>
            </span>
            <span className="flex items-center gap-1">
              <Mono className="text-[10px] text-text-mid">{formatCount(venue.followers)}</Mono>
              followers
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <FollowButton id={venue.id} size="md" className="w-full sm:w-auto sm:min-w-44" />
      </div>

      <p className="mt-4 border-l-2 border-amber-500/50 pl-3 text-sm leading-relaxed text-text-mid italic">
        “{venue.vibe}”
      </p>

      {/* -------------------------------------------- backline provided */}
      {venue.backline && venue.backline.length > 0 && (
        <>
          <SectionHeader
            title="Backline provided"
            className="mt-8 mb-3"
            action={
              <span className="mono inline-flex items-center gap-1.5 text-[10px] text-cyan-300">
                <CheckIcon size={12} />
                House gear
              </span>
            }
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {venue.backline.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
                style={{
                  background: "rgba(75,214,207,.06)",
                  borderColor: "rgba(75,214,207,.22)",
                }}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300">
                  <CheckIcon size={14} />
                </span>
                <span className="text-sm leading-snug text-text-hi">{item}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* --------------------------------------------- hiring house player */}
      {venue.hiring && (
        <>
          <SectionHeader title="Hiring" className="mt-8 mb-3" />
          <div className="rounded-2xl border border-amber-500/45 bg-gradient-to-br from-amber-500/12 via-amber-500/[0.04] to-transparent p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                <InstrumentIcon instrument={venue.hiring.role} size={20} />
              </span>
              <div className="min-w-0">
                <Mono className="text-[10px] text-amber-300">Hiring · house players</Mono>
                <p className="text-sm font-semibold">
                  {instrumentLabel(venue.hiring.role)}
                </p>
              </div>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-text-mid">
              {venue.hiring.note}
            </p>
            <FindSubButton
              instrument={venue.hiring.role}
              full
              className="mt-3.5 sm:hidden"
            />
            <FindSubButton
              instrument={venue.hiring.role}
              className="mt-3.5 hidden sm:inline-block"
            />
          </div>
        </>
      )}

      {/* ----------------------------------------------------- calendar */}
      <SectionHeader
        title={`Upcoming at ${venue.name}`}
        className="mt-8 mb-3"
        action={
          gigs.length > 0 ? (
            <Mono className="text-[10px] text-text-lo">
              {gigs.length} {gigs.length === 1 ? "night" : "nights"}
            </Mono>
          ) : undefined
        }
      />
      {gigs.length > 0 ? (
        <div className="flex flex-col gap-3">
          {gigs.map((gig) => (
            <Card key={gig.id}>
              <GigRow gig={gig} link="band" />
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Calendar's clear"
          body={`Follow ${venue.name} and the next announcement shows up in your feed.`}
        />
      )}

      {/* ------------------------------------------------ about booking */}
      <SectionHeader title="About booking" className="mt-8 mb-3" />
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
            <SendIcon size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Want this stage?</p>
            <p className="mt-1 text-sm leading-relaxed text-text-mid">
              Send your reel through Backline — the {venue.name} booking team checks
              profiles weekly and replies to everyone with open dates. A tight
              30-second clip beats a press kit every time.
            </p>
            <Link to="/profile" className="inline-block">
              <Button size="sm" variant="secondary" className="mt-3">
                Polish your profile
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <LinksSection links={venue.links} title="Venue links" className="mt-8" />
    </Page>
  );
}
