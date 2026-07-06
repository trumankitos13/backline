// In-thread booking offer card — the centerpiece of the money flow.
// Status renders live from the store: offer → accepted → paid (or declined).
// Once paid, it hosts the post-gig rating entry (Uber-style).

import type { Booking, Musician } from "../../lib/types";
import { useApp } from "../../lib/store";
import { Button, Card, Mono, StarInput, Stars } from "../ui";
import { CalendarIcon, CheckIcon, LockIcon } from "../icons";

export function BookingCard({
  booking,
  musician,
  onPay,
}: {
  booking: Booking;
  musician: Musician;
  /** open the payment sheet for this booking */
  onPay: (booking: Booking) => void;
}) {
  const { state, api } = useApp();
  const first = musician.name.split(" ")[0] ?? musician.name;

  const given = state.ratingsGiven[booking.musicianId] ?? [];
  const rated = given.length > 0;
  const myStars = rated ? given[given.length - 1]! : 0;

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
          <p className="text-sm text-text-mid">
            <span className="blink">⏳</span> Waiting for {first} to accept…
          </p>
        </div>
      )}

      {booking.status === "accepted" && (
        <div className="border-t border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
            <CheckIcon size={15} /> Accepted
          </p>
          <p className="mt-0.5 text-xs text-text-mid">
            Lock it in before {first}'s night books up.
          </p>
          <Button className="mt-2.5 w-full" onClick={() => onPay(booking)}>
            Pay ${booking.amount} — hold it
          </Button>
        </div>
      )}

      {booking.status === "paid" && (
        <>
          <div className="border-t border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
              <span>✅</span> Paid &amp; held
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-text-lo">
              <LockIcon size={12} className="shrink-0" /> Held until the gig —
              cancel-friendly up to 24h before.
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
                  onChange={(s) => api.rateMusician(booking.musicianId, s)}
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
    </Card>
  );
}
