// My profile (/profile): the current user's own view — availability toggle,
// reels placeholder, booking history, following list, and demo reset.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Page } from "../components/shell";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  SectionHeader,
  Toggle,
} from "../components/ui";
import {
  CalendarIcon,
  MapPinIcon,
  PlusIcon,
  UsersIcon,
} from "../components/icons";
import { useApp } from "../lib/store";
import { getBand, getMusician, getVenue } from "../lib/data";
import {
  BookingStatusBadge,
  FreeTonightBadge,
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
  const { state, api } = useApp();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);

  const user = state.user;
  // App.tsx redirects to /welcome when there's no user; guard anyway.
  if (!user) return null;

  // newest bookings first
  const bookings = [...state.bookings].reverse();

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
    navigate("/welcome");
  };

  return (
    <Page>
      {/* -------------------------------------------------------- header */}
      <header>
        <div className="flex items-start gap-4">
          <Avatar name={user.name} seed={99} size={80} className="ring-2 ring-zinc-800" />
          <div className="min-w-0 pt-0.5">
            <h1 className="truncate text-2xl font-bold tracking-tight">{user.name}</h1>
            <p className="text-sm text-zinc-500">@{user.handle}</p>
            <p className="mt-1.5 flex items-center gap-1 text-sm text-zinc-400">
              <MapPinIcon size={15} className="shrink-0 text-zinc-500" />
              {user.neighborhood}
            </p>
            {user.availableTonight && <FreeTonightBadge className="mt-2" />}
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
          <p className="text-sm font-semibold">Available tonight</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
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

      {/* ---------------------------------------------------------- reels */}
      <section className="mt-8">
        <SectionHeader title="Your reels" className="mb-3" />
        <div className="flex items-center gap-4">
          <div className="flex aspect-[9/16] w-32 shrink-0 flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-zinc-700/80 text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-400">
            <span className="rounded-full border border-zinc-700 p-2.5">
              <PlusIcon size={18} />
            </span>
            <span className="px-3 text-center text-xs leading-tight font-medium">
              Upload a reel
            </span>
          </div>
          <p className="max-w-[230px] text-xs leading-relaxed text-zinc-500">
            Reel uploads are coming soon. Thirty seconds of your best groove beats
            any bio — get a clip ready for launch day.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------- bookings */}
      <section className="mt-8">
        <SectionHeader
          title="Bookings"
          className="mb-3"
          action={
            bookings.length > 0 ? (
              <span className="text-xs text-zinc-500">
                {bookings.length} total
              </span>
            ) : undefined
          }
        />
        {bookings.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {bookings.map((b) => {
              const mus = getMusician(b.musicianId);
              return (
                <Card
                  key={b.id}
                  onClick={() => navigate(`/messages/c-${b.musicianId}`)}
                  className="flex items-center gap-3 p-3.5"
                >
                  {mus && <Avatar name={mus.name} seed={mus.seed} size={42} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {mus?.name ?? "Musician"}
                      </p>
                      <BookingStatusBadge status={b.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {b.gigTitle} · {b.venueName}
                    </p>
                    <p className="truncate text-xs text-zinc-600">
                      {b.date} · {b.time}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-zinc-200">
                    ${b.amount}
                  </span>
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
              <span className="text-xs text-zinc-500">{followed.length}</span>
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
                    <p className="truncate text-sm font-medium transition-colors group-hover:text-amber-300">
                      {f.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
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

      {/* ---------------------------------------------------- reset (demo) */}
      <div className="mt-10 border-t border-zinc-800/70 pt-6 pb-2 text-center">
        {confirmReset ? (
          <div className="flex flex-col items-center gap-2.5">
            <p className="text-sm text-zinc-400">
              This wipes your profile, chats, and bookings. Fresh stage, empty setlist.
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
            className="text-xs text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-400 hover:underline"
          >
            Reset demo data
          </button>
        )}
      </div>
    </Page>
  );
}
