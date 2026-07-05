// In-thread booking offer card — the centerpiece of the money flow.
// Status renders live from the store: offer → accepted → paid (or declined).

import type { Booking, Musician } from "../../lib/types";
import { Button, Card } from "../ui";
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
  const first = musician.name.split(" ")[0] ?? musician.name;

  return (
    <Card className="w-full overflow-hidden border-amber-400/25 bg-zinc-900/80">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-amber-400/15 bg-amber-400/10 px-4 py-2.5">
        <CalendarIcon size={15} className="text-amber-300" />
        <span className="text-[11px] font-bold tracking-widest text-amber-300 uppercase">
          Booking offer
        </span>
      </div>

      {/* gig details */}
      <div className="flex items-start justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <p className="truncate font-semibold text-zinc-100">{booking.gigTitle}</p>
          <p className="mt-0.5 truncate text-sm text-zinc-400">{booking.venueName}</p>
          <p className="text-sm text-zinc-400">
            {booking.date} · {booking.time}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold text-amber-300">${booking.amount}</p>
          <p className="text-[10px] text-zinc-500">for the night</p>
        </div>
      </div>

      {/* live status strip */}
      {booking.status === "offer" && (
        <div className="border-t border-zinc-800/80 bg-zinc-800/40 px-4 py-3">
          <p className="glow-pulse text-sm text-zinc-400">
            ⏳ Waiting for {first} to accept…
          </p>
        </div>
      )}

      {booking.status === "accepted" && (
        <div className="border-t border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
            <CheckIcon size={15} /> Accepted!
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Lock it in before {first}'s night books up.
          </p>
          <Button className="mt-2.5 w-full" onClick={() => onPay(booking)}>
            Pay ${booking.amount} to lock it in
          </Button>
        </div>
      )}

      {booking.status === "paid" && (
        <div className="border-t border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-300">
            ✅ Paid &amp; confirmed — see you at soundcheck
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
            <LockIcon size={12} /> Held in escrow until the gig
          </p>
        </div>
      )}

      {booking.status === "declined" && (
        <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-medium text-red-300">
            {first} passed on this one — try another player.
          </p>
        </div>
      )}
    </Card>
  );
}
