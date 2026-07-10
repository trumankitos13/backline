// Booking offer sheet — where the money flow starts. Sends the offer into the
// thread; the store simulates the musician accepting ~3.5s later.

import { useState, type FormEvent } from "react";
import type { InstrumentId, Player } from "../../lib/types";
import { VENUES } from "../../lib/data";
import { useApp } from "../../lib/store";
import { Button, Modal } from "../ui";
import { DollarIcon, LockIcon } from "../icons";
import { Field, inputCls } from "./form";

/** how you'd refer to this player in a "our X can't make it" text */
const ROLE_NOUN: Record<InstrumentId, string> = {
  guitar: "guitarist",
  bass: "bassist",
  drums: "drummer",
  keys: "keys player",
  vocals: "singer",
  sax: "sax player",
  trumpet: "trumpet player",
  violin: "fiddle player",
  "pedal-steel": "steel player",
  dj: "DJ",
  "sound-tech": "sound engineer",
  "lighting-tech": "lighting tech",
};

const CUSTOM_DATE = "Custom…";
const DATE_OPTIONS = ["Tonight", "Tomorrow", "Sat Jul 11", CUSTOM_DATE];

export function BookingSheet({
  open,
  onClose,
  musician,
  openingId,
}: {
  open: boolean;
  onClose: () => void;
  musician: Player;
  /** offer fills this posted Opening — prefilled from it; holding locks the seat */
  openingId?: string;
}) {
  const { state, api } = useApp();
  const first = musician.name.split(" ")[0] ?? musician.name;
  const primary: InstrumentId = musician.instruments[0]?.id ?? "guitar";

  // when the offer is for a posted opening, prefill from it (fee = the posted
  // take-home; title = the project's name when one owns the opening)
  const opening = openingId ? state.openings.find((o) => o.id === openingId) : undefined;
  const project = opening
    ? state.projects.find((p) => p.id === opening.postedBy.id)
    : undefined;

  const [gigTitle, setGigTitle] = useState(project?.name ?? "Fill-in gig");
  const [venue, setVenue] = useState<string>(VENUES[0]?.name ?? "Other");
  const [customVenue, setCustomVenue] = useState("");
  const [dateOpt, setDateOpt] = useState<string>(
    opening && !DATE_OPTIONS.includes(opening.when) ? CUSTOM_DATE : (opening?.when ?? "Tonight"),
  );
  const [customDate, setCustomDate] = useState(
    opening && !DATE_OPTIONS.includes(opening.when) ? opening.when : "",
  );
  const [time, setTime] = useState("9:00 PM");
  const [amount, setAmount] = useState(String(opening?.fee ?? musician.rate.min));
  const [note, setNote] = useState(
    project
      ? `Hey! Putting together ${project.name} — want the ${ROLE_NOUN[opening?.instrument ?? primary]} seat?`
      : `Hey! Our ${ROLE_NOUN[primary]} can't make it — can you cover?`,
  );

  const parsedAmount = Number(amount);
  const valid =
    gigTitle.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    api.sendBookingOffer({
      playerId: musician.id,
      gigTitle: gigTitle.trim(),
      venueName: venue === "Other" ? customVenue.trim() || "Venue TBD" : venue,
      date: dateOpt === CUSTOM_DATE ? customDate.trim() || "Date TBD" : dateOpt,
      time: time.trim() || "9:00 PM",
      amount: Math.round(parsedAmount),
      note: note.trim() || undefined,
      openingId,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Book ${first}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Event title">
          <input
            className={inputCls}
            value={gigTitle}
            onChange={(e) => setGigTitle(e.target.value)}
            placeholder="Fill-in gig"
          />
        </Field>

        <Field label="Venue">
          <select
            className={inputCls}
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          >
            {VENUES.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
          {venue === "Other" && (
            <input
              className={`${inputCls} mt-2`}
              value={customVenue}
              onChange={(e) => setCustomVenue(e.target.value)}
              placeholder="Where's the gig?"
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <select
              className={inputCls}
              value={dateOpt}
              onChange={(e) => setDateOpt(e.target.value)}
            >
              {DATE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Time">
            <input
              className={inputCls}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="9:00 PM"
            />
          </Field>
        </div>

        {dateOpt === CUSTOM_DATE && (
          <Field label="Custom date">
            <input
              className={inputCls}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              placeholder="e.g. Fri Jul 24"
              autoFocus
            />
          </Field>
        )}

        <Field
          label="Offer amount"
          hint={`Their rate: $${musician.rate.min}–$${musician.rate.max}`}
        >
          <div className="relative">
            <span className="mono absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-text-lo">
              $
            </span>
            <input
              type="number"
              min={1}
              step="any"
              inputMode="numeric"
              className={`${inputCls} pl-7`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </Field>

        <Field label="Note" hint="Optional">
          <textarea
            rows={2}
            className={`${inputCls} resize-none`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" disabled={!valid} className="w-full">
          <DollarIcon size={17} /> Send offer
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-text-lo">
          <LockIcon size={12} className="shrink-0" /> No charge yet — you only pay
          after {first} accepts.
        </p>
      </form>
    </Modal>
  );
}
