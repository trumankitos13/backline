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
import { FindSubButton, FollowButton } from "../components/bands/shared";
import {
  BoltIcon,
  CalendarIcon,
  MapPinIcon,
  ChevronRightIcon,
} from "../components/icons";
import { getEvent, getVenue, eventLineup } from "../lib/data";
import { instrumentLabel } from "../lib/instruments";

const SOURCE_LABEL: Record<string, string> = {
  backline: "On Backline",
  bandsintown: "via Bandsintown",
  ticketmaster: "via Ticketmaster",
  seatgeek: "via SeatGeek",
};

/**
 * A torn-ticket-stub date badge: a rounded block split by a perforated (dashed)
 * divider with two punched holes. Month/day in mono; amber accent for tonight.
 */
function TicketStub({
  date,
  time,
  tonight,
}: {
  date: string;
  time: string;
  tonight: boolean;
}) {
  // "Fri Jul 10" -> [weekday, month, day]
  const [weekday, month, day] = date.split(" ");
  return (
    <div
      className={`relative inline-flex items-stretch overflow-hidden rounded-xl border ${
        tonight
          ? "border-amber-500/50 bg-amber-500/[0.08]"
          : "border-hairline-strong bg-surface-800"
      }`}
    >
      {/* date block */}
      <div className="flex flex-col justify-center px-4 py-2.5 text-center">
        {tonight ? (
          <p className="mono blink text-base leading-none font-bold text-amber-300">
            TONIGHT
          </p>
        ) : (
          <>
            <p className="mono text-[10px] font-semibold tracking-wider text-text-lo">
              {month?.toUpperCase()}
            </p>
            <p className="mono text-2xl leading-none font-bold text-text-hi">
              {day}
            </p>
          </>
        )}
      </div>

      {/* perforated divider with two punched holes */}
      <div className="relative w-px shrink-0 self-stretch border-l border-dashed border-hairline-strong">
        <span className="absolute top-0 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" />
        <span className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-ink" />
      </div>

      {/* stub half */}
      <div className="flex flex-col justify-center px-4 py-2.5">
        <p
          className={`mono text-[10px] font-semibold tracking-wider ${
            tonight ? "text-amber-200/80" : "text-text-lo"
          }`}
        >
          {tonight ? "SHOWTIME" : weekday?.toUpperCase()}
        </p>
        <p className="mono mt-0.5 text-xs font-bold text-text-hi">{time}</p>
      </div>
    </div>
  );
}

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

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <TicketStub date={event.date} time={event.time} tonight={tonight} />
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

      {/* sub needed — the SOS hero card */}
      {event.subNeeded && (
        <div className="mb-6 rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-500/15 via-amber-500/[0.05] to-transparent p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            {/* pulsing bolt */}
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
              <span className="pulse-ring absolute inset-0 rounded-xl" aria-hidden="true" />
              <BoltIcon size={22} className="blink" />
            </span>
            <div className="min-w-0 flex-1">
              <Mono className="text-[10px] font-bold text-amber-300">
                Open slots · Sub needed
              </Mono>
              <p className="mt-1 text-base font-bold text-text-hi">
                {instrumentLabel(event.subNeeded.instrument)} needed
              </p>
              {event.subNeeded.note && (
                <p className="mt-1.5 text-sm leading-relaxed text-text-mid">
                  {event.subNeeded.note}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Mono className="text-lg font-bold text-amber-300">
                  ${event.subNeeded.payout}
                </Mono>
                <span className="mono inline-flex items-center gap-1.5 text-[11px] text-cyan-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  held until the gig
                </span>
              </div>
              <FindSubButton
                instrument={event.subNeeded.instrument}
                full
                className="mt-3.5"
              />
            </div>
          </div>
        </div>
      )}

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
