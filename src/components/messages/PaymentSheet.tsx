// Mock-Stripe payment sheet: order summary, fake prefilled card, fee
// breakdown, 1.2s "processing" spin, then an in-sheet receipt. No real money —
// production would be Stripe Connect destination charges.

import { useEffect, useRef, useState } from "react";
import type { Booking, Musician } from "../../lib/types";
import { useApp } from "../../lib/store";
import { Avatar, Button, Card, Modal } from "../ui";
import { CardIcon, CheckIcon, LockIcon } from "../icons";
import { inputCls } from "./form";

type Phase = "form" | "processing" | "success";

function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PaymentSheet({
  booking,
  musician,
  onClose,
}: {
  booking: Booking;
  musician: Musician;
  onClose: () => void;
}) {
  const { api } = useApp();
  const [phase, setPhase] = useState<Phase>("form");
  const timer = useRef<number | undefined>(undefined);

  // clean up the fake-processing timer if the sheet unmounts mid-flight
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const first = musician.name.split(" ")[0] ?? musician.name;
  const fee = booking.amount * 0.05;
  const total = booking.amount + fee;

  const pay = () => {
    setPhase("processing");
    timer.current = window.setTimeout(() => {
      api.payBooking(booking.id, musician.id);
      setPhase("success");
    }, 1200);
  };

  const readOnlyCls = `${inputCls} cursor-default text-zinc-300 select-none`;

  return (
    <Modal
      open
      onClose={() => {
        if (phase !== "processing") onClose();
      }}
      title={phase === "success" ? "Payment complete" : "Confirm & pay"}
    >
      {phase === "success" ? (
        // ---------------------------------------------------------- receipt
        <div className="flex flex-col items-center px-2 pb-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <CheckIcon size={30} />
          </div>
          <p className="mt-4 text-2xl font-bold">You're booked!</p>
          <p className="mt-1.5 text-sm text-zinc-400">
            {musician.name} · {booking.date} · {booking.time}
          </p>
          <p className="text-sm text-zinc-400">{booking.venueName}</p>
          <p className="mt-3 text-sm text-zinc-500">Receipt sent to your email.</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <LockIcon size={12} className="shrink-0" /> ${money(total)} held in
            escrow until the gig happens.
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        // ------------------------------------------------------- card form
        <div className="space-y-4">
          {/* order summary */}
          <Card className="p-3.5">
            <div className="flex items-center gap-3">
              <Avatar name={musician.name} seed={musician.seed} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{booking.gigTitle}</p>
                <p className="truncate text-xs text-zinc-400">
                  {booking.date} · {booking.time} · {booking.venueName}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  Paying {musician.name}
                </p>
              </div>
              <p className="shrink-0 text-lg font-bold text-amber-300">
                ${booking.amount}
              </p>
            </div>
          </Card>

          {/* fake card form */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              Payment method
            </p>
            <div className="relative">
              <CardIcon
                size={16}
                className="absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-500"
              />
              <input
                readOnly
                value="4242 4242 4242 4242"
                aria-label="Card number"
                className={`${readOnlyCls} pl-10 font-mono tracking-wider`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                readOnly
                value="12/28"
                aria-label="Expiry"
                className={`${readOnlyCls} font-mono`}
              />
              <input
                readOnly
                value="•••"
                aria-label="CVC"
                className={`${readOnlyCls} font-mono`}
              />
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <LockIcon size={12} className="shrink-0" /> Demo mode — no real
              charge.
            </p>
          </div>

          {/* fee breakdown */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 text-sm">
            <div className="flex items-center justify-between text-zinc-400">
              <span>{first}'s rate</span>
              <span className="text-zinc-200">${money(booking.amount)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-zinc-400">
              <span>SitIn fee (5%)</span>
              <span className="text-zinc-200">${money(fee)}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-zinc-800 pt-2.5 font-semibold">
              <span>Total</span>
              <span className="text-amber-300">${money(total)}</span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={pay}
            disabled={phase === "processing"}
          >
            {phase === "processing" ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950"
                  aria-hidden="true"
                />
                Processing…
              </>
            ) : (
              `Pay $${money(total)}`
            )}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-zinc-500">
            <LockIcon size={12} className="shrink-0" /> Held until the gig
            happens. Cancel-friendly up to 24h before.
          </p>
        </div>
      )}
    </Modal>
  );
}
