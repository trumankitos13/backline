import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { Booking, Player } from "../../lib/types";
import { useApp } from "../../lib/store";
import { isCloudBackend } from "../../lib/backend";
import { Avatar, Button, Card, Modal, Mono, SuccessCheck } from "../ui";
import { LockIcon } from "../icons";

const stripeKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "").trim();
const stripePromise = stripeKey.startsWith("pk_") ? loadStripe(stripeKey) : null;

function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function totals(booking: Booking) {
  const musicianCents = Math.round(booking.amount * 100);
  const serviceCents = Math.round(musicianCents * 0.1);
  return {
    fee: serviceCents / 100,
    total: (musicianCents + serviceCents) / 100,
  };
}

function PaymentSummary({ booking, musician }: { booking: Booking; musician: Player }) {
  const { fee, total } = totals(booking);
  return (
    <>
      <Card className="bg-surface-850 p-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={musician.name} seed={musician.seed} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{booking.gigTitle}</p>
            <Mono className="block truncate text-[10px] text-text-lo">
              {booking.date} · {booking.time} · {booking.venueName}
            </Mono>
            <p className="truncate text-xs text-text-mid">Paying {musician.name}</p>
          </div>
          <p className="mono shrink-0 text-lg font-bold text-amber-300">${booking.amount}</p>
        </div>
      </Card>
      <div className="rounded-xl border border-hairline-subtle bg-ink-near p-3.5 text-sm">
        <div className="flex items-center justify-between text-text-mid">
          <span>Fee — {musician.name.split(" ")[0]}'s take-home</span>
          <Mono className="text-[12px] text-text-hi">${money(booking.amount)}</Mono>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-text-mid">
          <span>Backline service (10%)</span>
          <Mono className="text-[12px] text-text-hi">${money(fee)}</Mono>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-hairline-subtle pt-2.5 font-semibold">
          <span>Total authorization</span>
          <Mono className="text-[13px] text-amber-300">${money(total)}</Mono>
        </div>
      </div>
    </>
  );
}

function StripePaymentForm({
  booking,
  musician,
  onClose,
}: {
  booking: Booking;
  musician: Player;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { total } = totals(booking);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    });
    if (result.error) {
      setError(result.error.message ?? "Stripe could not authorize this card.");
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center px-2 pb-2 text-center">
        <SuccessCheck size={64} />
        <p className="mt-4 text-2xl font-bold">Authorization submitted</p>
        <p className="mt-1.5 text-sm leading-relaxed text-text-mid">
          Stripe is confirming the hold. The booking will update automatically.
        </p>
        <Button size="lg" className="mt-6 w-full" onClick={onClose}>Done</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentSummary booking={booking} musician={musician} />
      <div className="rounded-xl border border-hairline-strong bg-white p-3">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={!stripe || submitting}>
        {submitting ? "Authorizing…" : `Authorize $${money(total)}`}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] leading-relaxed text-text-lo">
        <LockIcon size={12} className="shrink-0" /> This places a temporary card hold.
        Capture happens after the gig.
      </p>
    </form>
  );
}

function CloudPaymentSheet({
  booking,
  musician,
  onClose,
}: {
  booking: Booking;
  musician: Player;
  onClose: () => void;
}) {
  const { api } = useApp();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!stripePromise) {
      setError("Stripe is not configured for this deployment.");
      return () => { active = false; };
    }
    api.createBookingPaymentIntent(booking.id)
      .then((secret) => { if (active) setClientSecret(secret); })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not start payment.");
      });
    return () => { active = false; };
  }, [api, booking.id]);

  const options = useMemo(() => clientSecret ? ({
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: { colorPrimary: "#f59e0b", borderRadius: "10px" },
    },
  }) : null, [clientSecret]);

  return (
    <Modal open onClose={onClose} title="Authorize payment">
      {error ? (
        <div className="space-y-4">
          <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>
          <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
        </div>
      ) : stripePromise && options ? (
        <Elements stripe={stripePromise} options={options}>
          <StripePaymentForm booking={booking} musician={musician} onClose={onClose} />
        </Elements>
      ) : (
        <p className="text-sm text-text-mid">Preparing secure payment…</p>
      )}
    </Modal>
  );
}

function DemoPaymentSheet({
  booking,
  musician,
  onClose,
}: {
  booking: Booking;
  musician: Player;
  onClose: () => void;
}) {
  const { api } = useApp();
  const [processing, setProcessing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const { total } = totals(booking);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pay = () => {
    setProcessing(true);
    timer.current = window.setTimeout(() => {
      api.holdBooking(booking.id, musician.id);
      onClose();
    }, 900);
  };

  return (
    <Modal open onClose={() => { if (!processing) onClose(); }} title="Hold payment · demo">
      <div className="space-y-4">
        <PaymentSummary booking={booking} musician={musician} />
        <p className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs text-text-mid">
          Demo mode uses no card and moves this booking to held locally.
        </p>
        <Button size="lg" className="w-full" onClick={pay} disabled={processing}>
          {processing ? "Holding…" : `Demo hold $${money(total)}`}
        </Button>
      </div>
    </Modal>
  );
}

export function PaymentSheet(props: {
  booking: Booking;
  musician: Player;
  onClose: () => void;
}) {
  return isCloudBackend ? <CloudPaymentSheet {...props} /> : <DemoPaymentSheet {...props} />;
}
