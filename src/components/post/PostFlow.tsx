// The "Post an opening" flow — the deliberate sibling of SOS. Where SOS is a
// 1-seat "who bailed?!" broadcast, this is composing an opening in a *context*:
// posting as yourself, a band you admin, or a venue you manage. The "acting as"
// chip is the one affordance that carries the capabilities model into the UI —
// it recolors the copy and, crucially, names where the fee is held from.
// See docs/V1_SPEC.md → "Acting as — the posting & SOS UX".

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { INSTRUMENTS, instrumentLabel } from "../../lib/instruments";
import { myActingContexts, type ActingContext } from "../../lib/actingAs";
import { useApp } from "../../lib/store";
import { isSelectableGigDate, scheduleOpening, todayIso, tomorrowIso } from "../../lib/scheduling";
import type { InstrumentId } from "../../lib/types";
import { Avatar, Button, Chip, Mono, SuccessCheck, Toggle } from "../ui";
import { BoltIcon, CheckIcon, CloseIcon, InstrumentIcon, LockIcon, PlusIcon } from "../icons";

type Phase = "form" | "sent";

export function PostFlow({
  open,
  onClose,
  onNewProject,
  initialContextId = null,
  initialRole = null,
}: {
  open: boolean;
  onClose: () => void;
  /** "+ New project" in the picker → the Assemble flow */
  onNewProject?: () => void;
  /** context to post as, inherited from where the user tapped (?as=). */
  initialContextId?: string | null;
  /** instrument to pre-select (?role=). */
  initialRole?: InstrumentId | null;
}) {
  const navigate = useNavigate();
  const { state, api } = useApp();
  const contexts = myActingContexts(state.user, state.projects);

  const [phase, setPhase] = useState<Phase>("form");
  const [ctx, setCtx] = useState<ActingContext>(contexts[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [role, setRole] = useState<InstrumentId | null>(initialRole);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [urgent, setUrgent] = useState(false);

  // fresh form each open; honour the inherited context + role deep links.
  useEffect(() => {
    if (!open) return;
    const all = myActingContexts(state.user, state.projects);
    setPhase("form");
    setPickerOpen(false);
    setCtx(all.find((c) => c.id === initialContextId) ?? all[0]);
    setRole(initialRole);
    setDate("");
    setTime("");
    setFee("");
    setNote("");
    setUrgent(false);
  }, [open, initialContextId, initialRole, state.user, state.projects]);

  // esc + body scroll lock while the sheet is up
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const selectableDate = date !== "" && isSelectableGigDate(date, todayIso());
  const canPost = role !== null && Number(fee) > 0 && selectableDate && time !== "";
  const multiContext = contexts.length > 1;
  const asPlayer = ctx.kind === "player";
  const scheduled = selectableDate && time ? scheduleOpening(date, time) : null;

  function submit() {
    if (!canPost || role === null || !scheduled || !isSelectableGigDate(date, todayIso())) return;
    api.postOpening({
      instrument: role,
      postedBy: { kind: ctx.kind, id: ctx.id },
      when: scheduled.label,
      gigAt: scheduled.gigAt,
      fee: Number(fee),
      note: note.trim() || undefined,
      urgent,
    });
    setPhase("sent");
  }

  function findSubs() {
    onClose();
    if (role) navigate(`/?sos=open&role=${role}`);
  }

  function viewInFeed() {
    onClose();
    navigate("/feed");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Post an opening"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[26px] border border-hairline bg-surface-sheet p-5 pb-6 shadow-[0_-30px_60px_-30px_#000] rise sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* mobile grabber */}
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline-strong sm:hidden" />

        {/* header lockup */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-ink-near shadow-[0_10px_30px_-10px_var(--accent)]">
              <PlusIcon size={18} />
            </span>
            <div className="min-w-0">
              <Mono className="block text-[10px] font-bold text-amber-300">Backline</Mono>
              <p className="truncate font-semibold text-text-hi">
                {phase === "form" ? "Post an opening" : "Opening posted"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-text-lo transition-colors hover:bg-surface-800 hover:text-text-hi"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* ------------------------------------------------------------ form */}
        {phase === "form" && (
          <div className="mt-5 space-y-5">
            {/* acting-as context */}
            <div>
              <Mono className="text-[11px] text-text-lo">Posting as</Mono>
              <button
                type="button"
                disabled={!multiContext}
                onClick={() => setPickerOpen((v) => !v)}
                aria-expanded={pickerOpen}
                className={`mt-2 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  pickerOpen
                    ? "border-amber-500/50 bg-amber-500/[0.06]"
                    : "border-hairline-strong bg-surface-900"
                } ${multiContext ? "hover:border-text-faint" : "cursor-default"}`}
              >
                <Avatar name={ctx.name} seed={ctx.seed} size={34} square={ctx.square} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-hi">{ctx.name}</p>
                  <Mono className="truncate text-[10px] text-text-lo">{ctx.detail}</Mono>
                </div>
                {multiContext && (
                  <span
                    className={`shrink-0 text-text-lo transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                )}
              </button>

              {/* picker — only when the user actually has more than one context */}
              {pickerOpen && multiContext && (
                <div className="mt-2 flex flex-col gap-1.5 rounded-xl border border-hairline-strong bg-surface-900 p-1.5">
                  {contexts.map((c) => {
                    const active = c.id === ctx.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCtx(c);
                          setPickerOpen(false);
                        }}
                        className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          active ? "bg-amber-500/10" : "hover:bg-surface-800"
                        }`}
                      >
                        <Avatar name={c.name} seed={c.seed} size={30} square={c.square} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-hi">{c.name}</p>
                          <Mono className="truncate text-[10px] text-text-lo">{c.detail}</Mono>
                        </div>
                        {active && <CheckIcon size={15} className="shrink-0 text-amber-300" />}
                      </button>
                    );
                  })}
                  {/* assemble a pickup band — needs more than one seat */}
                  {onNewProject && (
                    <button
                      type="button"
                      onClick={onNewProject}
                      className="flex items-center gap-3 rounded-lg border-t border-hairline-subtle px-2.5 py-2 text-left transition-colors hover:bg-surface-800"
                    >
                      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-dashed border-hairline-strong text-amber-300">
                        <PlusIcon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-hi">New project</p>
                        <Mono className="truncate text-[10px] text-text-lo">
                          Assemble a pickup band — N seats
                        </Mono>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* instrument */}
            <div>
              <Mono className="text-[11px] text-text-lo">What do you need?</Mono>
              <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
                {INSTRUMENTS.map((ins) => (
                  <Chip
                    key={ins.id}
                    active={role === ins.id}
                    onClick={() => setRole(role === ins.id ? null : ins.id)}
                  >
                    <InstrumentIcon instrument={ins.id} size={13} />
                    {ins.short}
                  </Chip>
                ))}
              </div>
            </div>

            {/* schedule */}
            <div>
              <Mono className="text-[11px] text-text-lo">When&apos;s the gig?</Mono>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip active={date === todayIso()} onClick={() => setDate(todayIso())}>Today</Chip>
                <Chip active={date === tomorrowIso()} onClick={() => setDate(tomorrowIso())}>Tomorrow</Chip>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input aria-label="Gig date" type="date" min={todayIso()} value={date} onChange={(event) => setDate(event.currentTarget.value)} className="w-full rounded-xl border border-hairline-strong bg-surface-900 px-3 py-2.5 text-sm text-text-hi focus:border-amber-500 focus:outline-none" />
                <input aria-label="Gig time" type="time" value={time} onChange={(event) => setTime(event.currentTarget.value)} className="w-full rounded-xl border border-hairline-strong bg-surface-900 px-3 py-2.5 text-sm text-text-hi focus:border-amber-500 focus:outline-none" />
              </div>
            </div>

            {/* fee — private */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <Mono className="text-[11px] text-text-lo">Fee (the player&apos;s take-home)</Mono>
                <Mono className="inline-flex items-center gap-1 text-[10px] text-cyan-300">
                  <LockIcon size={11} />
                  Private
                </Mono>
              </div>
              <div className="relative mt-2">
                <span className="mono pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-text-lo">
                  $
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step="any"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="150"
                  aria-label="Fee"
                  className="w-full rounded-xl border border-hairline-strong bg-surface-900 py-2.5 pr-3 pl-7 text-sm text-text-hi transition-colors placeholder:text-text-lo focus:border-amber-500 focus:outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-text-lo">
                Only the player you offer sees this — never your bandmates or the room.
              </p>
            </div>

            {/* note */}
            <div>
              <Mono className="text-[11px] text-text-lo">Add a note (optional)</Mono>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Charts ready, soundcheck 7:30, brushes a plus…"
                className="mt-2 w-full resize-none rounded-xl border border-hairline-strong bg-surface-900 px-3 py-2.5 text-sm text-text-hi transition-colors placeholder:text-text-lo focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* urgent */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-hairline-strong bg-surface-900 px-3 py-2.5">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-text-hi">
                  <BoltIcon size={14} className="text-amber-300" />
                  Mark urgent
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-text-lo">
                  SOS-grade — pushes to free players nearby right now.
                </p>
              </div>
              <Toggle checked={urgent} onChange={setUrgent} label="Mark urgent" />
            </div>

            {/* fee source — the one place context does real work */}
            <div className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2.5">
              <LockIcon size={13} className="shrink-0 text-cyan-300" />
              <Mono className="text-[11px] leading-relaxed text-cyan-300">
                Held from {asPlayer ? "your" : `${ctx.name}'s`} card until the gig.
              </Mono>
            </div>

            <Button
              variant={urgent ? "sos" : "primary"}
              size="lg"
              className="w-full"
              disabled={!canPost}
              onClick={submit}
            >
              {urgent && <BoltIcon size={18} />}
              {canPost
                ? `Post ${instrumentLabel(role!)} opening`
                : role === null
                  ? "Pick an instrument"
                  : date === "" || time === ""
                    ? "Add a date and time"
                    : "Add a fee to post"}
            </Button>
          </div>
        )}

        {/* ------------------------------------------------------------ sent */}
        {phase === "sent" && (
          <div className="mt-6 flex flex-col items-center gap-3 py-2 text-center">
            <SuccessCheck size={60} />
            <div>
              <p className="text-lg font-semibold text-text-hi">Opening&apos;s live</p>
              <p className="mt-1 text-sm leading-relaxed text-text-mid">
                {asPlayer
                  ? "Players who match will see it. First yes locks the seat."
                  : `Posted as ${ctx.name}. Players who match will see it — first yes locks the seat.`}
              </p>
            </div>

            {/* attribution + summary card */}
            <div className="mt-1 w-full rounded-2xl border border-hairline-strong bg-surface-900 p-3.5 text-left">
              <div className="flex items-center gap-2.5">
                <Avatar name={ctx.name} seed={ctx.seed} size={32} square={ctx.square} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-hi">{ctx.name}</p>
                  <Mono className="truncate text-[10px] text-text-lo">is hiring</Mono>
                </div>
                {urgent && (
                  <span className="mono inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-ink-near">
                    <BoltIcon size={11} />
                    URGENT
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2.5 border-t border-hairline-subtle pt-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                  <InstrumentIcon instrument={role!} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-hi">
                    {instrumentLabel(role!)}
                  </p>
                  <Mono className="text-[10px] text-text-lo">{scheduled?.label}</Mono>
                </div>
                <div className="text-right">
                  <Mono className="text-sm font-bold text-amber-300">${Number(fee)}</Mono>
                  <Mono className="flex items-center justify-end gap-1 text-[9px] text-cyan-300">
                    <LockIcon size={9} />
                    held
                  </Mono>
                </div>
              </div>
            </div>

            <div className="mt-2 grid w-full grid-cols-2 gap-2">
              <Button variant="secondary" size="md" className="w-full" onClick={viewInFeed}>
                See it in the feed
              </Button>
              <Button variant="primary" size="md" className="w-full" onClick={findSubs}>
                <BoltIcon size={16} />
                Find subs now
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
