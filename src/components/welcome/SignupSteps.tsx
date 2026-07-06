// Three-step onboarding stepper: identity → instruments → home base.
// Creates the CurrentUser via api.setUser and drops the new user into the app.

import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { InstrumentId } from "../../lib/types";
import { INSTRUMENTS } from "../../lib/instruments";
import { useApp } from "../../lib/store";
import { Button, Card, Mono, Toggle } from "../ui";
import {
  ArrowLeftIcon,
  BoltIcon,
  CheckIcon,
  ChevronRightIcon,
  InstrumentIcon,
  MapPinIcon,
} from "../icons";
import { INPUT_CLASS } from "./shared";

const NEIGHBORHOODS = [
  "East Austin",
  "South Congress",
  "Hyde Park",
  "Zilker",
  "Bouldin Creek",
  "Mueller",
  "Downtown",
  "North Loop",
  "Riverside",
  "Cherrywood",
];

/** "Ray Delgado Jr." → "raydelgadojr" */
function suggestHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
}

const STEP_META = [
  {
    title: "Who are you?",
    sub: "This is how bandleaders see you when you pop up in a search.",
  },
  {
    title: "What do you play?",
    sub: "Multi-select — the more you list, the more searches you turn up in.",
  },
  {
    title: "Where's home base?",
    sub: "Backline is neighborhood-first: the closer you are, the sooner you get the call.",
  },
] as const;

/** small uppercase field label in the mono data layer. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Mono className="text-[10px] font-bold text-text-lo">{children}</Mono>;
}

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === step
              ? "w-6 bg-amber-500"
              : i < step
                ? "w-3 bg-amber-500/50"
                : "w-3 bg-hairline-strong"
          }`}
        />
      ))}
    </div>
  );
}

export function SignupSteps() {
  const { api } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);

  // step 1 — identity
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);

  // step 2 — instruments
  const [instruments, setInstruments] = useState<InstrumentId[]>([]);

  // step 3 — home base
  const [neighborhood, setNeighborhood] = useState("");
  const [availableTonight, setAvailableTonight] = useState(false);

  const stepValid = [
    name.trim().length >= 2 && handle.length >= 2,
    instruments.length >= 1,
    neighborhood !== "",
  ][step];

  const onNameChange = (value: string) => {
    setName(value);
    if (!handleTouched) setHandle(suggestHandle(value));
  };

  const onHandleChange = (value: string) => {
    const clean = value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24);
    setHandle(clean);
    // if they clear it entirely, go back to auto-suggesting from the name
    setHandleTouched(clean.length > 0);
  };

  const onEnterAdvance = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (stepValid && step < 2) setStep(step + 1);
    }
  };

  const toggleInstrument = (id: InstrumentId) =>
    setInstruments((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  const finish = () => {
    if (!stepValid) return;
    api.setUser({
      name: name.trim(),
      handle,
      instruments,
      neighborhood,
      availableTonight,
    });
    navigate("/");
  };

  const meta = STEP_META[step];

  return (
    <Card className="p-5 sm:p-7">
      {/* header: step counter + progress dots */}
      <div className="flex items-center justify-between gap-4">
        <Mono className="text-[11px] font-bold text-text-lo">
          Step {step + 1} of 3
        </Mono>
        <ProgressDots step={step} />
      </div>

      {/* keyed so each step gets the entrance animation from Welcome's <style> */}
      <div key={step} className="wlc-rise mt-4">
        <h3 className="text-xl font-bold tracking-tight text-text-hi">{meta.title}</h3>
        <p className="mt-1 text-sm text-text-mid">{meta.sub}</p>

        {step === 0 && (
          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Name</FieldLabel>
              <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={onEnterAdvance}
                placeholder="Ray Delgado"
                autoComplete="name"
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Handle</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-text-lo">
                  @
                </span>
                <input
                  value={handle}
                  onChange={(e) => onHandleChange(e.target.value)}
                  onKeyDown={onEnterAdvance}
                  placeholder="raydelgado"
                  autoComplete="off"
                  spellCheck={false}
                  className={`${INPUT_CLASS} pl-9`}
                />
              </div>
              <span className="text-xs text-text-lo">
                {handle
                  ? `You'll show up in search and chat as @${handle}.`
                  : "We'll suggest one from your name — or type your own."}
              </span>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="mt-5">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {INSTRUMENTS.map((inst) => {
                const selected = instruments.includes(inst.id);
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => toggleInstrument(inst.id)}
                    aria-pressed={selected}
                    className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all ${
                      selected
                        ? "border-amber-500/70 bg-amber-500/10 text-amber-300 ring-2 ring-amber-500/50"
                        : "border-hairline-subtle bg-surface-800 text-text-mid hover:border-hairline-strong hover:text-text-hi"
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-ink-near">
                        <CheckIcon size={10} strokeWidth={3} />
                      </span>
                    )}
                    <InstrumentIcon instrument={inst.id} size={22} />
                    <span className="text-center text-[11px] leading-tight font-medium">
                      {inst.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <Mono className="mt-3 block text-[10px] leading-relaxed font-bold text-text-lo">
              Pick everything you gig on — techs count as players here
            </Mono>
            <p className="mt-1.5 text-xs text-text-lo">
              {instruments.length > 0
                ? `${instruments.length} selected — bands search by instrument, so more is more.`
                : "Pick at least one to keep going."}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <FieldLabel>Neighborhood</FieldLabel>
              <div className="relative">
                <MapPinIcon
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-lo"
                />
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className={`${INPUT_CLASS} appearance-none pr-10 pl-10 ${
                    neighborhood === "" ? "text-text-lo" : ""
                  }`}
                >
                  <option value="" disabled>
                    Choose your neighborhood
                  </option>
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <ChevronRightIcon
                  size={16}
                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 rotate-90 text-text-lo"
                />
              </div>
            </label>

            <div
              className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                availableTonight
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-hairline-subtle bg-surface-800"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  availableTonight
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-surface-raised text-text-mid"
                }`}
              >
                <BoltIcon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text-hi">Available tonight?</p>
                <p className="mt-0.5 text-xs leading-relaxed text-text-mid">
                  Flip this on and you'll show up when someone's drummer bails.
                </p>
              </div>
              <Toggle
                checked={availableTonight}
                onChange={setAvailableTonight}
                label="Available tonight"
              />
            </div>
          </div>
        )}
      </div>

      {/* footer nav */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeftIcon size={16} />
            Back
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        {step < 2 ? (
          <Button type="button" onClick={() => setStep(step + 1)} disabled={!stepValid}>
            Next
            <ChevronRightIcon size={16} />
          </Button>
        ) : (
          <Button type="button" size="lg" onClick={finish} disabled={!stepValid}>
            Take me to the scene
          </Button>
        )}
      </div>
    </Card>
  );
}
