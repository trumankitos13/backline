// /v/:id — venue page: header + vibe, upcoming calendar with band
// cross-links, and a short "how booking works here" card.

import { Link, useParams } from "react-router-dom";
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
  BoltIcon,
  MapPinIcon,
  UsersIcon,
} from "../components/icons";
import { FollowButton, GigRow } from "../components/bands/shared";
import { GIGS, getVenue } from "../lib/data";

export default function VenueDetail() {
  const { id } = useParams<{ id: string }>();
  const venue = id ? getVenue(id) : undefined;

  if (!venue) {
    return (
      <Page title="Venue not found">
        <EmptyState
          icon={<MapPinIcon size={32} />}
          title="This room isn't on SitIn"
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

  const gigs = GIGS.filter((g) => g.venueId === venue.id);

  return (
    <Page>
      <Link
        to="/bands"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
      >
        <ArrowLeftIcon size={16} />
        Bands & venues
      </Link>

      {/* ------------------------------------------------------- header */}
      <div className="flex items-start gap-4">
        <Avatar name={venue.name} seed={venue.seed} size={84} square />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{venue.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <MapPinIcon size={13} />
              {venue.neighborhood}
            </span>
            <span className="flex items-center gap-1">
              <UsersIcon size={13} />
              cap {formatCount(venue.capacity)}
            </span>
            <span>
              <span className="font-semibold text-zinc-300">
                {formatCount(venue.followers)}
              </span>{" "}
              followers
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <FollowButton id={venue.id} size="md" className="w-full sm:w-auto sm:min-w-44" />
      </div>

      <p className="mt-4 border-l-2 border-amber-400/60 pl-3 text-sm leading-relaxed text-zinc-300 italic">
        “{venue.vibe}”
      </p>

      {/* ----------------------------------------------------- calendar */}
      <SectionHeader
        title={`Upcoming at ${venue.name}`}
        className="mt-8 mb-3"
        action={
          gigs.length > 0 ? (
            <span className="text-xs text-zinc-500">
              {gigs.length} {gigs.length === 1 ? "night" : "nights"}
            </span>
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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <BoltIcon size={19} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Want this stage?</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              Send your reel through SitIn — the {venue.name} booking team checks
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
    </Page>
  );
}
