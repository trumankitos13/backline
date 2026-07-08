// /e/:id — an Event profile page. Events are first-class objects: a show at a
// Venue, performed by Band(s)/Player(s), with a ticket link and external links.

import { Link, useNavigate, useParams } from "react-router-dom";
import { Page } from "../components/shell";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Mono,
  SectionHeader,
} from "../components/ui";
import { LinksSection } from "../components/links";
import { FollowButton } from "../components/bands/shared";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  ChevronRightIcon,
} from "../components/icons";
import { getEvent, getVenue, eventLineup } from "../lib/data";

const SOURCE_LABEL: Record<string, string> = {
  backline: "On Backline",
  bandsintown: "via Bandsintown",
  ticketmaster: "via Ticketmaster",
  seatgeek: "via SeatGeek",
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const event = id ? getEvent(id) : undefined;

  if (!event) {
    return (
      <Page>
        <EmptyState
          icon={<CalendarIcon size={34} />}
          title="We couldn't find that show"
          body="This event may have wrapped or the link is old."
          action={<Button onClick={() => navigate("/feed")}>Back to the feed</Button>}
        />
      </Page>
    );
  }

  const venue = getVenue(event.venueId);
  const { bands, players } = eventLineup(event);
  const tonight = event.date === "Tonight";
  const ticketHref = event.ticketUrl ?? event.externalUrl;

  return (
    <Page>
      {/* hero */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Mono
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
              tonight
                ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                : "border-hairline-strong bg-surface-800 text-text-mid"
            } ${tonight ? "blink" : ""}`}
          >
            {tonight ? "● Tonight" : "Upcoming"}
          </Mono>
          {event.source && (
            <Mono className="text-[10px] text-text-lo">
              {SOURCE_LABEL[event.source] ?? event.source}
            </Mono>
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{event.title}</h1>

        <div className="mt-3 flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-2 text-sm text-text-mid">
            <CalendarIcon size={16} className="text-text-lo" />
            <Mono className="text-text-hi">{event.date}</Mono>
            <ClockIcon size={15} className="ml-1 text-text-lo" />
            <Mono className="text-text-hi">{event.time}</Mono>
          </span>
          {venue && (
            <Link
              to={`/v/${venue.id}`}
              className="group inline-flex w-fit items-center gap-2 text-sm text-text-mid transition-colors hover:text-amber-300"
            >
              <MapPinIcon size={16} className="text-text-lo" />
              <span className="font-medium">{venue.name}</span>
              <Mono className="text-[11px] text-text-lo">· {venue.neighborhood}</Mono>
            </Link>
          )}
        </div>
      </div>

      {/* ticket CTA */}
      <Card className="mb-6 flex items-center justify-between gap-4 p-4">
        <div>
          <Mono className="text-[10px] text-text-lo">Tickets</Mono>
          <p className="mt-0.5 text-xl font-bold text-text-hi">{event.ticket ?? "Free"}</p>
        </div>
        {ticketHref ? (
          <a href={ticketHref} target="_blank" rel="noreferrer noopener">
            <Button>Get tickets</Button>
          </a>
        ) : (
          <Button variant="secondary" onClick={() => venue && navigate(`/v/${venue.id}`)}>
            Details at the door
          </Button>
        )}
      </Card>

      {/* about */}
      {event.description && (
        <section className="mb-6">
          <SectionHeader title="About" className="mb-2" />
          <p className="text-sm leading-relaxed text-text-mid">{event.description}</p>
        </section>
      )}

      {/* lineup */}
      {(bands.length > 0 || players.length > 0) && (
        <section className="mb-6">
          <SectionHeader title="Lineup" className="mb-3" />
          <div className="flex flex-col gap-2">
            {bands.map((b, i) => (
              <Link key={b.id} to={`/b/${b.id}`}>
                <Card className="flex items-center gap-3 p-3">
                  <Avatar name={b.name} seed={b.seed} size={44} square />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {b.name}
                      {i === 0 && (
                        <Mono className="ml-2 text-[9px] text-amber-300">Headliner</Mono>
                      )}
                    </p>
                    <p className="truncate text-xs text-text-lo">{b.genres.join(" · ")}</p>
                  </div>
                  <ChevronRightIcon size={16} className="shrink-0 text-text-faint" />
                </Card>
              </Link>
            ))}
            {players.map((p) => (
              <Link key={p.id} to={`/m/${p.id}`}>
                <Card className="flex items-center gap-3 p-3">
                  <Avatar name={p.name} seed={p.seed} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-text-lo">
                      Guest · {p.instruments.map((i) => i.id).join(", ")}
                    </p>
                  </div>
                  <ChevronRightIcon size={16} className="shrink-0 text-text-faint" />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* venue follow prompt */}
      {venue && (
        <Card className="mb-6 flex items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={venue.name} seed={venue.seed} size={40} square />
            <div className="min-w-0">
              <Link to={`/v/${venue.id}`} className="truncate text-sm font-semibold hover:text-amber-300">
                {venue.name}
              </Link>
              <p className="mono truncate text-[10px] text-text-lo">
                {venue.neighborhood} · cap {venue.capacity}
              </p>
            </div>
          </div>
          <FollowButton id={venue.id} />
        </Card>
      )}

      <LinksSection links={event.links} title="Event links" />
    </Page>
  );
}
