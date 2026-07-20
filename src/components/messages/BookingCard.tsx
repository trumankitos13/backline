// In-thread booking offer card — the centerpiece of the money flow.
// Status renders live from the store. Cloud payment states come only from
// verified Stripe/server paths; demo mode retains local hold/release controls.

import { useState, type FormEvent } from "react";
import type { Booking, BookingDisputeReason, Player } from "../../lib/types";
import { useApp } from "../../lib/store";
import { isCloudBackend } from "../../lib/backend";
import { Button, Card, Mono, StarInput, Stars } from "../ui";
import { CalendarIcon, CheckIcon, LockIcon } from "../icons";
import { Field, inputCls } from "./form";

export function BookingCard({
  booking,
  musician,
  onPay,
}: {
  booking: Booking;
  musician: Player;
  /** open the payment sheet for this booking */
  onPay: (booking: Booking) => void;
}) {
  const { state, api } = useApp();
  const first = musician.name.split(" ")[0] ?? musician.name;
  const incoming = booking.direction === "incoming";
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState<BookingDisputeReason>("no_show");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [filingDispute, setFilingDispute] = useState(false);
  const [showCancellation, setShowCancellation] = useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const given = state.ratingsGiven[booking.playerId] ?? [];
  const rated = given.length > 0;
  const myStars = rated ? given[given.length - 1]! : 0;
  const gigAtMs = booking.gigAt ? new Date(booking.gigAt).getTime() : Number.NaN;
  const hoursUntilGig = (gigAtMs - Date.now()) / (60 * 60 * 1000);
  const canCancelHeld = !Number.isFinite(gigAtMs) || hoursUntilGig > 0;
  const lateBookerCancellation = !incoming && hoursUntilGig > 0 && hoursUntilGig < 24;
  const latePayout = (booking.amount * 0.5).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  async function submitDispute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilingDispute(true);
    setDisputeError(null);
    try {
      await api.fileBookingDispute(booking.id, disputeReason, disputeDetails.trim());
    } catch (error) {
      setDisputeError(error instanceof Error ? error.message : "Could not file the dispute.");
    } finally {
      setFilingDispute(false);
    }
  }

  async function cancelHeldBooking() {
    setCancelling(true);
    setCancellationError(null);
    try {
      await api.cancelHeldBooking(booking.id);
    } catch (error) {
      setCancellationError(error instanceof Error ? error.message : "Could not cancel the booking.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card className="w-full overflow-hidden border-amber-500/25 bg-surface-900">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-amber-500/15 bg-amber-500/10 px-4 py-2.5">
        <CalendarIcon size={15} className="text-amber-300" />
        <Mono className="text-[11px] font-bold text-amber-300">Booking offer</Mono>
      </div>

      {/* gig details */}
      <div className="flex items-start justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <p className="truncate font-semibold text-text-hi">{booking.gigTitle}</p>
          <p className="mt-0.5 truncate text-sm text-text-mid">{booking.venueName}</p>
          <Mono className="mt-0.5 block text-[11px] text-text-mid">
            {booking.date} · {booking.time}
          </Mono>
        </div>
        <div className="shrink-0 text-right">
          <p className="mono text-2xl font-bold text-amber-300">${booking.amount}</p>
          <Mono className="text-[9px] text-text-lo">for the night</Mono>
        </div>
      </div>

      {/* live status strip */}
      {booking.status === "offer" && (
        <div className="border-t border-hairline-subtle bg-surface-800/50 px-4 py-3">
          {incoming ? (
            <>
              <p className="text-sm font-semibold text-text-hi">
                {first} invited you to play this gig.
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => api.respondToBooking(booking.id, "declined")}
                >
                  Decline
                </Button>
                <Button onClick={() => api.respondToBooking(booking.id, "accepted")}>
                  Accept offer
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-text-mid">
                <span className="blink">⏳</span> Waiting for {first} to accept…
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2.5 w-full"
                onClick={() => api.cancelBooking(booking.id)}
              >
                Withdraw offer
              </Button>
            </>
          )}
        </div>
      )}

      {booking.status === "accepted" && (
        <div className="border-t border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
            <CheckIcon size={15} /> Accepted
          </p>
          <p className="mt-0.5 text-xs text-text-mid">
            {incoming
              ? `${first} can now move this offer to payment.`
              : isCloudBackend
                ? "This booking is ready for the payment step."
                : `Lock it in before ${first}'s night books up.`}
          </p>
          {!incoming && (
            <Button className="mt-2.5 w-full" onClick={() => onPay(booking)}>
              {isCloudBackend
                ? `Authorize payment — $${booking.amount} take-home`
                : `Hold $${booking.amount} — lock it in`}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2.5 w-full"
            onClick={() => api.cancelBooking(booking.id)}
          >
            Cancel booking
          </Button>
        </div>
      )}

      {booking.status === "paid" && (
        <div className="border-t border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
            <LockIcon size={15} /> Paid — gig completion pending
          </p>
        </div>
      )}

      {booking.status === "completed" && (
        <div className="border-t border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
            <CheckIcon size={15} /> Booking complete
          </p>
        </div>
      )}

      {booking.status === "held" && (
        <div className="border-t border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
            <LockIcon size={15} /> Held — releases after the gig
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-text-lo">
            {first} is locked in. The money moves 24h after showtime unless a
            participant reports a problem for review.
          </p>
          {isCloudBackend ? (
            <Button variant="secondary" size="sm" className="mt-2.5 w-full" disabled>
              Release is server-controlled
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="mt-2.5 w-full"
              onClick={() => api.releaseBooking(booking.id, booking.playerId)}
            >
              Gig played — release ${booking.amount} now
            </Button>
          )}
          {showDisputeForm ? (
            <form className="mt-3 space-y-3 border-t border-cyan-400/15 pt-3" onSubmit={submitDispute}>
              <p className="text-xs leading-relaxed text-text-mid">
                Filing freezes the release while Backline reviews the booking.
              </p>
              <Field label="What happened?">
                <select
                  className={inputCls}
                  value={disputeReason}
                  onChange={(event) => setDisputeReason(event.target.value as BookingDisputeReason)}
                >
                  <option value="no_show">No-show</option>
                  <option value="quality">Service issue</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Details" hint={`${disputeDetails.length}/2000`}>
                <textarea
                  className={`${inputCls} min-h-24 resize-y`}
                  value={disputeDetails}
                  onChange={(event) => setDisputeDetails(event.target.value)}
                  maxLength={2000}
                  required
                  placeholder="Tell us what happened so the review team has enough context."
                />
              </Field>
              {disputeError && (
                <p className="text-xs text-[var(--color-danger)]" role="alert">
                  {disputeError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDisputeForm(false)}
                  disabled={filingDispute}
                >
                  Never mind
                </Button>
                <Button type="submit" variant="danger" size="sm" disabled={filingDispute}>
                  {filingDispute ? "Filing…" : "Freeze & review"}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="mt-2.5 w-full"
              onClick={() => {
                setShowCancellation(false);
                setShowDisputeForm(true);
              }}
            >
              Report a problem
            </Button>
          )}
          {canCancelHeld && !showDisputeForm && (showCancellation ? (
            <div className="mt-3 border-t border-hairline-subtle pt-3">
              <p className="text-xs font-semibold text-text-hi">Cancel this booking?</p>
              <p className="mt-1 text-xs leading-relaxed text-text-mid">
                {incoming
                  ? "The full hold goes back to the booker and the opening can be reopened."
                  : lateBookerCancellation
                    ? `$${latePayout} goes to ${first} as the 50% late-cancellation payout; the rest of the hold is released.`
                    : "The full card hold is released. No cancellation fee is charged."}
              </p>
              {cancellationError && (
                <p className="mt-2 text-xs text-[var(--color-danger)]" role="alert">
                  {cancellationError}
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={cancelling}
                  onClick={() => setShowCancellation(false)}
                >
                  Keep booking
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={cancelling}
                  onClick={cancelHeldBooking}
                >
                  {cancelling ? "Cancelling…" : "Confirm cancellation"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                setShowDisputeForm(false);
                setShowCancellation(true);
              }}
            >
              Cancel booking
            </Button>
          ))}
        </div>
      )}

      {booking.status === "disputed" && (
        <div className="border-t border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-300">
            <LockIcon size={15} /> Payment frozen for review
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-text-lo">
            The automatic release is paused. Backline support will review the booking before
            money moves.
          </p>
        </div>
      )}

      {booking.status === "released" && (
        <>
          <div className="border-t border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
              <CheckIcon size={15} /> Released — ${booking.amount} on its way to {first}
            </p>
            <p className="mt-1 text-[11px] text-text-lo">
              Paid through Backline. This lands on your paid-on-time record.
            </p>
          </div>

          {/* post-gig rating entry (Uber-style) */}
          <div className="border-t border-hairline-subtle px-4 py-3.5">
            {rated ? (
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-cyan-300">
                <CheckIcon size={15} className="shrink-0" /> Thanks — you rated
                <Stars rating={myStars} size={14} />
              </p>
            ) : (
              <>
                <Mono className="mb-2 block text-[11px] font-bold text-text-lo">
                  How was the gig?
                </Mono>
                <StarInput
                  value={0}
                  onChange={(s) => api.rateMusician(booking.playerId, s)}
                  size={30}
                />
              </>
            )}
          </div>
        </>
      )}

      {booking.status === "declined" && (
        <div className="border-t border-hairline-subtle bg-surface-800/50 px-4 py-3">
          <p className="text-sm font-medium text-[var(--color-danger)]">
            {first} passed on this one — try another player.
          </p>
        </div>
      )}

      {booking.status === "cancelled" && (
        <div className="border-t border-hairline-subtle bg-surface-800/50 px-4 py-3">
          <p className="text-sm font-medium text-text-lo">This booking was cancelled.</p>
        </div>
      )}

      {booking.status === "refunded" && (
        <div className="border-t border-hairline-subtle bg-surface-800/50 px-4 py-3">
          <p className="text-sm font-medium text-text-mid">This payment was refunded.</p>
        </div>
      )}
    </Card>
  );
}
