// Mock-Stripe payment sheet: order summary, fake prefilled card, fee
// breakdown, ~1.2s "holding" spin, then an in-sheet receipt. No real money —
// production would be Stripe Connect destination charges. Backline: cyan = held.

import { useEffect, useRef, useState } from "react";
import type { Booking, Player } from "../../lib/types";
import { useApp } from "../../lib/store";
import { Avatar, Button, Card, Modal, Mono, SuccessCheck } from "../ui";
import { CardIcon, LockIcon } from "../icons";
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
  musician: Player;
  onClose: () => void;
}) {
  const { api } = useApp();
  const [phase, setPhase] = useState<Phase>("form");
  const timer = useRef<number | undefined>(undefined);

  // clean up the fake-processing timer if the sheet unmounts mid-flight
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const fee = booking.amount * 0.05;
  const total = booking.amount + fee;

  const pay = () => {
    setPhase("processing");
    timer.current = window.setTimeout(() => {
      api.payBooking(booking.id, musician.id);
      setPhase("success");
    }, 1200);
  };

  const readOnlyCls = `${inputCls} cursor-default select-none text-text-mid`;

  return (
    <Modal
      open
      onClose={() => {
        if (phase !== "processing") onClose();
      }}
      title={phase === "success" ? "You're booked" : "Hold payment"}
    >
      {phase === "success" ? (
        // ---------------------------------------------------------- receipt
        <div className="flex flex-col items-center px-2 pb-2 text-center">
          <SuccessCheck size={64} />
          <p className="mt-4 text-2xl font-bold">You're booked!</p>
          <p className="mt-1.5 text-sm text-text-mid">
            {musician.name} · {booking.venueName}
          </p>
          <Mono className="mt-0.5 text-[11px] text-text-lo">
            {booking.date} · {booking.time}
          </Mono>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-cyan-300">
            <LockIcon size={13} className="shrink-0" />
            <span className="mono text-[11px]">${money(total)}</span> held —
            released after the show.
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        // ------------------------------------------------------- card form
        <div className="space-y-4">
          {/* order summary */}
          <Card className="bg-surface-850 p-3.5">
            <div className="flex items-center gap-3">
              <Avatar name={musician.name} seed={musician.seed} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{booking.gigTitle}</p>
                <Mono className="block truncate text-[10px] text-text-lo">
                  {booking.date} · {booking.time} · {booking.venueName}
                </Mono>
                <p className="truncate text-xs text-text-mid">
                  Paying {musician.name}
                </p>
              </div>
              <p className="mono shrink-0 text-lg font-bold text-amber-300">
                ${booking.amount}
              </p>
            </div>
          </Card>

          {/* fake card form */}
          <div className="space-y-2.5">
            <Mono className="block text-[11px] font-bold text-text-lo">
              Payment method
            </Mono>
            <div className="relative">
              <CardIcon
                size={16}
                className="absolute top-1/2 left-3.5 -translate-y-1/2 text-text-lo"
              />
              <input
                readOnly
                value="4242 4242 4242 4242"
                aria-label="Card number"
                className={`${readOnlyCls} mono pl-10`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                readOnly
                value="12/28"
                aria-label="Expiry"
                className={`${readOnlyCls} mono`}
              />
              <input
                readOnly
                value="•••"
                aria-label="CVC"
                className={`${readOnlyCls} mono`}
              />
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-text-lo">
              <LockIcon size={12} className="shrink-0" /> Demo mode — no real
              charge.
            </p>
          </div>

          {/* fee breakdown */}
          <div className="rounded-xl border border-hairline-subtle bg-ink-near p-3.5 text-sm">
            <div className="flex items-center justify-between text-text-mid">
              <span>Performance fee</span>
              <Mono className="text-[12px] text-text-hi">${money(booking.amount)}</Mono>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-text-mid">
              <span>Backline service (5%)</span>
              <Mono className="text-[12px] text-text-hi">${money(fee)}</Mono>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-hairline-subtle pt-2.5 font-semibold">
              <span>Total</span>
              <Mono className="text-[13px] text-amber-300">${money(total)}</Mono>
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
                  className="spin h-4 w-4 rounded-full border-2 border-ink-near/30 border-t-ink-near"
                  aria-hidden="true"
                />
                Holding…
              </>
            ) : (
              `Hold $${money(total)}`
            )}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-text-lo">
            <LockIcon size={12} className="shrink-0" /> Held until the gig
            happens. Cancel-friendly up to 24h before.
          </p>
        </div>
      )}
    </Modal>
  );
}
