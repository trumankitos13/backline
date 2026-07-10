// My profile (/profile): the current user's own view — availability toggle,
// reels placeholder, booking history, following list, demo reset, and (in cloud
// mode) sign out. Backline tokens throughout: mono data atoms, amber scarce.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Page } from "../components/shell";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  FreeTonightBadge,
  Mono,
  SectionHeader,
  Toggle,
} from "../components/ui";
import {
  BoltIcon,
  CalendarIcon,
  InstrumentIcon,
  MapPinIcon,
  PlusIcon,
  UsersIcon,
} from "../components/icons";
import { useApp } from "../lib/store";
import { isCloudBackend } from "../lib/backend";
import { getBand, getPlayer, getVenue } from "../lib/data";
import { resolveActingContext } from "../lib/actingAs";
import { instrumentLabel } from "../lib/instruments";
import {
  BookingStatusBadge,
  InstrumentChips,
} from "../components/profile/shared";

interface FollowedEntry {
  id: string;
  kind: "band" | "venue";
  name: string;
  seed: number;
  meta: string;
  to: string;
}

export default function MyProfile() {
  const { state, api, auth } = useApp();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  const user = state.user;
  // App.tsx redirects to /welcome when there's no user; guard anyway.
  if (!user) return null;

  // a real signed-in account (cloud mode) — demo mode has status signedIn but a
  // null auth.user, so gate sign-out on the user actually being present.
  const signedInReal = auth.status === "signedIn" && auth.user !== null;

  // newest bookings first
  const bookings = [...state.bookings].reverse();
  const openings = state.openings;

  const followed = state.following
    .map((fid): FollowedEntry | null => {
      const band = getBand(fid);
      if (band) {
        return {
          id: fid,
          kind: "band",
          name: band.name,
          seed: band.seed,
          meta: band.genres.join(" · "),
          to: `/b/${fid}`,
        };
      }
      const venue = getVenue(fid);
      if (venue) {
        return {
          id: fid,
          kind: "venue",
          name: venue.name,
          seed: venue.seed,
          meta: `${venue.neighborhood} · ${venue.capacity} cap`,
          to: `/v/${fid}`,
        };
      }
      return null;
    })
    .filter((f): f is FollowedEntry => f !== null);

  const handleReset = () => {
    api.reset();
    // demo mode clears the profile too → back to onboarding; cloud keeps the
    // account, so just close the confirm and stay put.
    if (isCloudBackend) setConfirmReset(false);
    else navigate("/welcome");
  };

  return (
    <Page>
      {/* -------------------------------------------------------- header */}
      <header>
        <div className="flex items-start gap-4">
          <Avatar name={user.name} seed={99} size={80} className="ring-2 ring-hairline-strong" />
          <div className="min-w-0 pt-0.5">
            <h1 className="truncate text-2xl font-bold tracking-tight">{user.name}</h1>
            <Mono className="mt-0.5 block text-xs text-text-lo">@{user.handle}</Mono>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-text-mid">
              <MapPinIcon size={15} className="shrink-0 text-text-lo" />
              {user.neighborhood}
            </p>
            {user.availableTonight && <FreeTonightBadge className="mt-2.5" />}
          </div>
        </div>
        <InstrumentChips
          instruments={user.instruments.map((iid) => ({ id: iid }))}
          className="mt-4"
        />
      </header>

      {/* ---------------------------------------------- availability toggle */}
      <Card className="mt-6 flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-hi">Available tonight</p>
          <p className="mt-0.5 text-xs leading-relaxed text-text-lo">
            {user.availableTonight
              ? "You're showing up in tonight's sub searches. Keep your phone loud."
              : "Flip this on and bands hunting a last-minute sub will find you."}
          </p>
        </div>
        <Toggle
          checked={user.availableTonight}
          onChange={(next) => api.updateUser({ availableTonight: next })}
          label="Available tonight"
        />
      </Card>

      {/* ------------------------------------- post an opening / assemble */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <Card
          onClick={() => navigate("/?post=open")}
          className="flex items-center gap-3 p-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
            <PlusIcon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-hi">Post an opening</p>
            <p className="mt-0.5 text-xs leading-relaxed text-text-lo">
              One seat — as you, a band, or a venue.
            </p>
          </div>
          <span className="arrow-nudge shrink-0 text-text-lo" aria-hidden="true">
            →
          </span>
        </Card>
        <Card
          onClick={() => navigate("/?assemble=open")}
          className="flex items-center gap-3 p-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/12 text-cyan-300">
            <UsersIcon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-hi">Start a project</p>
            <p className="mt-0.5 text-xs leading-relaxed text-text-lo">
              Assemble a pickup band — N seats, group chat.
            </p>
          </div>
          <span className="arrow-nudge shrink-0 text-text-lo" aria-hidden="true">
            →
          </span>
        </Card>
      </div>

      {/* ------------------------------------------------- your projects */}
      {state.projects.length > 0 && (
        <section className="mt-8">
          <SectionHeader
            title="Your projects & bands"
            className="mb-3"
            action={<Mono className="text-[10px] text-text-lo">{state.projects.length}</Mono>}
          />
          <div className="flex flex-col gap-2.5">
            {state.projects.map((p) => (
              <Card
                key={p.id}
                onClick={() => navigate(`/b/${p.id}`)}
                className="flex items-center gap-3 p-3.5"
              >
                <Avatar name={p.name} seed={p.seed} size={42} square />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-hi">{p.name}</p>
                  <Mono className="block truncate text-[10px] text-text-lo">
                    {p.members.length} {p.members.length === 1 ? "member" : "members"}
                  </Mono>
                </div>
                <Mono
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                    p.archived
                      ? "border-hairline-strong text-text-lo"
                      : p.kind === "standing"
                        ? "border-amber-500/45 bg-amber-500/10 text-amber-300"
                        : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                  }`}
                >
                  {p.archived ? "ARCHIVED" : p.kind === "standing" ? "STANDING" : "PROJECT"}
                </Mono>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------- your openings */}
      {openings.length > 0 && (
        <section className="mt-8">
          <SectionHeader
            title="Your openings"
            className="mb-3"
            action={<Mono className="text-[10px] text-text-lo">{openings.length} posted</Mono>}
          />
          <div className="flex flex-col gap-2.5">
            {openings.map((op) => {
              const ctx = resolveActingContext(op.postedBy, user, state.projects);
              return (
                <Card key={op.id} className="flex items-center gap-3 p-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-300">
                    <InstrumentIcon instrument={op.instrument} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-text-hi">
                      <span className="truncate">{instrumentLabel(op.instrument)}</span>
                      {op.urgent && (
                        <span className="mono inline-flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-ink-near">
                          <BoltIcon size={9} />
                          URGENT
                        </span>
                      )}
                    </p>
                    <Mono className="block truncate text-[10px] text-text-lo">
                      as {ctx.name} · {op.when}
                    </Mono>
                  </div>
                  <div className="shrink-0 text-right">
                    <Mono className="text-sm font-bold text-text-hi">${op.fee}</Mono>
                    <Mono
                      className={`block text-[9px] uppercase ${
                        op.status === "filled" ? "text-amber-300" : "text-cyan-300"
                      }`}
                    >
                      {op.status === "filled" ? "Filled" : "Open"}
                    </Mono>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- reels */}
      <section className="mt-8">
        <SectionHeader title="Your reels" className="mb-3" />
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled
            className="flex aspect-[9/16] w-32 shrink-0 cursor-not-allowed flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-hairline-strong text-text-lo"
          >
            <span className="rounded-full border border-hairline-strong p-2.5">
              <PlusIcon size={18} />
            </span>
            <Mono className="px-3 text-center text-[10px] leading-tight">
              Upload a reel
            </Mono>
          </button>
          <div className="max-w-[230px]">
            <Mono className="text-[10px] text-amber-300">Coming soon</Mono>
            <p className="mt-1.5 text-xs leading-relaxed text-text-lo">
              Thirty seconds of your best groove beats any bio — get a clip ready
              for launch day.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- bookings */}
      <section className="mt-8">
        <SectionHeader
          title="Bookings"
          className="mb-3"
          action={
            bookings.length > 0 ? (
              <Mono className="text-[10px] text-text-lo">{bookings.length} total</Mono>
            ) : undefined
          }
        />
        {bookings.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {bookings.map((b) => {
              const mus = getPlayer(b.playerId);
              return (
                <Card
                  key={b.id}
                  onClick={() => navigate(`/messages/c-${b.playerId}`)}
                  className="flex items-center gap-3 p-3.5"
                >
                  {mus && <Avatar name={mus.name} seed={mus.seed} size={42} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text-hi">
                        {mus?.name ?? "Player"}
                      </p>
                      <BookingStatusBadge status={b.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-text-lo">
                      {b.gigTitle} · {b.venueName}
                    </p>
                    <Mono className="block truncate text-[10px] text-text-faint">
                      {b.date} · {b.time}
                    </Mono>
                  </div>
                  <Mono className="shrink-0 text-sm font-bold text-text-hi">
                    ${b.amount}
                  </Mono>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarIcon size={30} />}
            title="No bookings yet"
            body="Find a player, open the chat, and send a booking offer — your gig history lands here."
            action={
              <Button size="sm" variant="secondary" onClick={() => navigate("/")}>
                Find players
              </Button>
            }
          />
        )}
      </section>

      {/* ------------------------------------------------------ following */}
      <section className="mt-8">
        <SectionHeader
          title="Following"
          className="mb-3"
          action={
            followed.length > 0 ? (
              <Mono className="text-[10px] text-text-lo">{followed.length}</Mono>
            ) : undefined
          }
        />
        {followed.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {followed.map((f) => (
              <Card key={f.id} className="flex items-center gap-3 p-3">
                <Link to={f.to} className="group flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={f.name} seed={f.seed} size={42} square />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-hi transition-colors group-hover:text-amber-300">
                      {f.name}
                    </p>
                    <p className="truncate text-xs text-text-lo">
                      {f.kind === "band" ? "Band" : "Venue"} · {f.meta}
                    </p>
                  </div>
                </Link>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => api.toggleFollow(f.id)}
                >
                  Unfollow
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<UsersIcon size={30} />}
            title="Not following anyone yet"
            body="Follow bands and venues to fill your feed with gigs, reels, and SOS sub calls."
            action={
              <Button size="sm" variant="secondary" onClick={() => navigate("/bands")}>
                Browse bands
              </Button>
            }
          />
        )}
      </section>

      {/* ---------------------------------------------- reset + sign out */}
      <div className="mt-10 flex flex-col items-center gap-3 border-t border-hairline-subtle pt-6 pb-2 text-center">
        {confirmReset ? (
          <div className="flex flex-col items-center gap-2.5">
            <p className="text-sm text-text-mid">
              {isCloudBackend
                ? "This clears your chats, bookings, and follows. Your account stays."
                : "This wipes your profile, chats, and bookings. Fresh stage, empty setlist."}
            </p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={handleReset}>
                Yes, reset everything
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                Keep my data
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="mono text-[10px] text-text-faint underline-offset-4 transition-colors hover:text-text-mid hover:underline"
          >
            {isCloudBackend ? "Reset my activity" : "Reset demo data"}
          </button>
        )}
        {signedInReal && (
          <button
            onClick={() => {
              void api.signOut();
            }}
            className="mono text-[10px] text-text-faint underline-offset-4 transition-colors hover:text-text-mid hover:underline"
          >
            Sign out
          </button>
        )}
      </div>
    </Page>
  );
}
