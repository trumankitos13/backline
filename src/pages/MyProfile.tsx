// My profile (/profile): the current user's own view — availability toggle,
// reels placeholder, booking history, following list, demo reset, and (in cloud
// mode) sign out. Backline tokens throughout: mono data atoms, amber scarce.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { SCENES, type SceneId } from "../lib/scenes";
import { ProfileEditor } from "../components/profile/ProfileEditor";
import { EmbeddedReelViewer, ReelTile } from "../components/video";
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
  const [searchParams] = useSearchParams();
  const [confirmReset, setConfirmReset] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reelAt, setReelAt] = useState<number | null>(null);
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [availabilityHours, setAvailabilityHours] = useState(4);
  const [shareLocationForMatching, setShareLocationForMatching] = useState(false);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const payoutRefreshStarted = useRef(false);

  const user = state.user;
  // a real signed-in account (cloud mode) — demo mode has status signedIn but a
  // null auth.user, so gate sign-out on the user actually being present.
  const signedInReal = auth.status === "signedIn" && auth.user !== null;
  const connectState = searchParams.get("connect");
  const connectReturn = connectState === "return";

  const startPayoutOnboarding = useCallback(async () => {
    setPayoutBusy(true);
    setPayoutError(null);
    try {
      const url = await api.startPayoutOnboarding();
      window.location.assign(url);
    } catch (error) {
      setPayoutError(error instanceof Error ? error.message : "Could not start payout setup.");
      setPayoutBusy(false);
    }
  }, [api]);

  useEffect(() => {
    if (
      !signedInReal
      || connectState !== "refresh"
      || payoutRefreshStarted.current
    ) return;
    payoutRefreshStarted.current = true;
    void startPayoutOnboarding();
  }, [connectState, signedInReal, startPayoutOnboarding]);

  // App.tsx redirects to /welcome when there's no user; guard after hooks so
  // hook ordering stays stable during auth hydration.
  if (!user) return null;

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

  const changeAvailability = async (next: boolean) => {
    setAvailabilityBusy(true);
    setAvailabilityError(null);
    try {
      if (!next) {
        await api.clearAvailability();
        return;
      }

      let location: { latitude: number; longitude: number } | undefined;
      if (shareLocationForMatching) {
        if (!("geolocation" in navigator)) {
          throw new Error("This browser cannot provide location. Turn off nearby matching to continue.");
        }
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10_000,
            maximumAge: 5 * 60_000,
          });
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      }

      const availableUntil = new Date(
        Date.now() + availabilityHours * 60 * 60 * 1000,
      ).toISOString();
      await api.setAvailability(availableUntil, location);
    } catch (error) {
      const isGeolocationError = typeof error === "object" && error !== null && "code" in error;
      setAvailabilityError(isGeolocationError
        ? "Location was not shared. Turn off nearby matching to go available scene-wide."
        : error instanceof Error
          ? error.message
          : "Could not update availability.");
    } finally {
      setAvailabilityBusy(false);
    }
  };

  return (
    <Page>
      {/* -------------------------------------------------------- header */}
      <header>
        <div className="flex items-start gap-4">
          <Avatar name={user.name} seed={99} src={user.avatarUrl} size={80} className="ring-2 ring-hairline-strong" />
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
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { setSaved(false); setEditing(true); }}>
            Edit player profile
          </Button>
          {user.id && (
            <Button size="sm" variant="secondary" onClick={() => navigate(`/m/${user.id}`)}>
              View public profile
            </Button>
          )}
          {saved && <Mono className="self-center text-[10px] text-cyan-300">Saved to Backline</Mono>}
        </div>
      </header>

      {editing && (
        <ProfileEditor
          user={user}
          onCancel={() => setEditing(false)}
          onUploadAvatar={api.uploadAvatar}
          onSave={async (patch) => {
            await api.updateUser(patch);
            setEditing(false);
            setSaved(true);
          }}
        />
      )}

      {/* ------------------------------------------- expiring availability */}
      <Card className="mt-6 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-hi">Available for last-minute gigs</p>
          <p className="mt-0.5 text-xs leading-relaxed text-text-lo">
            {user.availableTonight
              ? user.availableUntil
                ? `You're searchable until ${new Date(user.availableUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Keep your phone loud.`
                : "You're searchable for the next few hours. Keep your phone loud."
              : "Go live for a limited window so bands hunting a last-minute sub can find you."}
          </p>
          </div>
          <Toggle
            checked={user.availableTonight}
            disabled={availabilityBusy}
            onChange={(next) => { void changeAvailability(next); }}
            label="Available for last-minute gigs"
          />
        </div>
        {!user.availableTonight && (
          <div className="mt-4 space-y-3 border-t border-hairline-subtle pt-3">
            <label className="flex items-center justify-between gap-3 text-xs text-text-mid">
              <span>Availability window</span>
              <select
                value={availabilityHours}
                onChange={(event) => setAvailabilityHours(Number(event.currentTarget.value))}
                className="rounded-lg border border-hairline-strong bg-surface-900 px-2.5 py-2 text-xs text-text-hi focus:border-amber-500 focus:outline-none"
              >
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
              </select>
            </label>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-text-mid">
              <input
                type="checkbox"
                checked={shareLocationForMatching}
                onChange={(event) => setShareLocationForMatching(event.currentTarget.checked)}
                className="mt-0.5 accent-amber-500"
              />
              <span>
                Use my precise location for nearby matching. Coordinates stay private and matches
                see only rounded distance. Leave this off for scene-wide matching.
              </span>
            </label>
          </div>
        )}
        {availabilityError && (
          <p className="mt-3 text-xs text-red-300" role="alert">{availabilityError}</p>
        )}
      </Card>

      <Card className="mt-4 p-4">
        <p className="text-sm font-semibold text-text-hi">Settings</p>
        <label className="mt-3 flex items-center justify-between gap-4 text-sm text-text-mid">
          <span>Scene</span>
          <select
            aria-label="Scene"
            value={user.scene}
            onChange={(event) => {
              void api.updateUser({ scene: event.currentTarget.value as SceneId })
                .catch((error) => console.error("[backline] scene update failed", error));
            }}
            className="rounded-lg border border-hairline-strong bg-surface-900 px-2.5 py-2 text-sm text-text-hi focus:border-amber-500 focus:outline-none"
          >
            {SCENES.map((scene) => (
              <option key={scene.id} value={scene.id}>{scene.label}</option>
            ))}
          </select>
        </label>
        {isCloudBackend && signedInReal && (
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-hairline-subtle pt-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-hi">Stripe payouts</p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-lo">
                {connectReturn
                  ? "You're back from Stripe. Continue setup if Stripe still needs information."
                  : "Set up secure identity verification and bank payouts with Stripe."}
              </p>
              {payoutError && (
                <p role="alert" className="mt-1 text-xs text-[var(--color-danger)]">
                  {payoutError}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={payoutBusy}
              onClick={() => void startPayoutOnboarding()}
            >
              {payoutBusy ? "Opening…" : connectReturn ? "Continue setup" : "Set up payouts"}
            </Button>
          </div>
        )}
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
        {(user.reels ?? []).length > 0 ? (
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            {(user.reels ?? []).map((reel, index) => (
              <ReelTile key={reel.id} reel={reel} onPlay={() => setReelAt(index)} className="w-32 sm:w-36" />
            ))}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex aspect-[9/16] w-32 shrink-0 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-hairline-strong text-text-lo hover:border-amber-500/40 hover:text-amber-300"
            >
              <span className="rounded-full border border-current p-2.5"><PlusIcon size={18} /></span>
              <Mono className="px-3 text-center text-[10px] leading-tight">Add another</Mono>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-hairline-strong p-4 text-left text-text-lo hover:border-amber-500/40"
          >
            <span className="rounded-full border border-hairline-strong p-2.5"><PlusIcon size={18} /></span>
            <span>
              <span className="block text-sm font-semibold text-text-hi">Feature your first reel</span>
              <span className="mt-1 block text-xs">Paste a public TikTok or YouTube clip—no re-upload needed.</span>
            </span>
          </button>
        )}
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
      {reelAt !== null && (user.reels ?? []).length > 0 && (
        <EmbeddedReelViewer reels={user.reels ?? []} startIndex={reelAt} ownerName={user.name} onClose={() => setReelAt(null)} />
      )}
    </Page>
  );
}
