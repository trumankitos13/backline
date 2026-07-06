// Three-step onboarding stepper: identity → instruments → home base.
// Creates the CurrentUser via api.setUser and drops the new user into the app.

import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { InstrumentId } from "../../lib/types";
import { INSTRUMENTS } from "../../lib/instruments";
import { useApp } from "../../lib/store";
import { Button, Card, Toggle } from "../ui";
import {
  ArrowLeftIcon,
  BoltIcon,
  CheckIcon,
  ChevronRightIcon,
  InstrumentIcon,
  MapPinIcon,
} from "../icons";

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

const INPUT_CLASS =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15 focus:outline-none";

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
    sub: "Pick everything you gig on — techs count as players here.",
  },
  {
    title: "Where's home base?",
    sub: "Backline is neighborhood-first: the closer you are, the sooner you get the call.",
  },
] as const;

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === step
              ? "w-6 bg-amber-400"
              : i < step
                ? "w-3 bg-amber-400/50"
                : "w-3 bg-zinc-700"
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
        <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Step {step + 1} of 3
        </span>
        <ProgressDots step={step} />
      </div>

      {/* keyed so each step gets the entrance animation from Welcome's <style> */}
      <div key={step} className="wlc-rise mt-4">
        <h3 className="text-xl font-bold tracking-tight">{meta.title}</h3>
        <p className="mt-1 text-sm text-zinc-400">{meta.sub}</p>

        {step === 0 && (
          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-400">Name</span>
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
              <span className="text-xs font-medium text-zinc-400">Handle</span>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-zinc-500">
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
              <span className="text-xs text-zinc-500">
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
                        ? "border-amber-400/70 bg-amber-400/10 text-amber-300 ring-2 ring-amber-400/50"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-zinc-950">
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
            <p className="mt-3 text-xs text-zinc-500">
              {instruments.length > 0
                ? `${instruments.length} selected — bands search by instrument, so more is more.`
                : "Pick at least one to keep going."}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-400">Neighborhood</span>
              <div className="relative">
                <MapPinIcon
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-500"
                />
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className={`${INPUT_CLASS} appearance-none pr-10 pl-10 ${
                    neighborhood === "" ? "text-zinc-500" : ""
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
                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 rotate-90 text-zinc-500"
                />
              </div>
            </label>

            <div
              className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                availableTonight
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-zinc-800 bg-zinc-900/60"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  availableTonight
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <BoltIcon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Available tonight?</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
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
