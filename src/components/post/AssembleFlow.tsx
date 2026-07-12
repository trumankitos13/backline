// "Assemble a band" — the pickup-project flow (docs/V1_SPEC.md → Projects,
// pickup bands & group chats). Creates a `project` Band + one Opening per
// seat. The creator chooses whether they play (a performing member) or just
// organize (writer/producer — a non-performing admin). Auto-named, editable,
// no naming gate. The group chat spins up later, on the first hold.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { INSTRUMENTS, instrument as instrumentInfo } from "../../lib/instruments";
import { useApp } from "../../lib/store";
import { isSelectableGigDate, scheduleOpening, todayIso, tomorrowIso } from "../../lib/scheduling";
import type { InstrumentId } from "../../lib/types";
import { Avatar, Button, Chip, Mono, SuccessCheck } from "../ui";
import { CloseIcon, InstrumentIcon, LockIcon, UsersIcon } from "../icons";

type Phase = "form" | "sent";

export function AssembleFlow({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { state, api } = useApp();

  const [phase, setPhase] = useState<Phase>("form");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [myInstrument, setMyInstrument] = useState<InstrumentId>(
    state.user?.instruments[0] ?? "guitar",
  );
  const [seats, setSeats] = useState<InstrumentId[]>([]);
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  const firstName = state.user?.name.split(" ")[0] ?? "Your";
  const selectableDate = date !== "" && isSelectableGigDate(date, todayIso());
  const scheduled = selectableDate && time ? scheduleOpening(date, time) : null;
  const autoName = useMemo(
    () => `${firstName}'s Pickup · ${scheduled?.label ?? "Schedule TBD"}`,
    [firstName, scheduled?.label],
  );

  // fresh form each open
  useEffect(() => {
    if (!open) return;
    setPhase("form");
    setDate("");
    setTime("");
    setName("");
    setNameTouched(false);
    setPlaying(true);
    setMyInstrument(state.user?.instruments[0] ?? "guitar");
    setSeats([]);
    setFee("");
    setNote("");
    setCreatedId(null);
  }, [open, state.user]);

  // esc + body scroll lock
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

  const finalName = (nameTouched && name.trim()) || autoName;
  const canCreate = seats.length > 0 && Number(fee) > 0 && selectableDate && scheduled !== null;

  function toggleSeat(id: InstrumentId) {
    setSeats((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function create() {
    if (!canCreate || !scheduled || !isSelectableGigDate(date, todayIso())) return;
    const id = api.createProject({
      name: finalName,
      when: scheduled.label,
      gigAt: scheduled.gigAt,
      playing: playing ? { instrument: myInstrument } : null,
      seats,
      feePerSeat: Number(fee),
      note: note.trim() || undefined,
    });
    setCreatedId(id);
    setPhase("sent");
  }

  function viewProject() {
    onClose();
    if (createdId) navigate(`/b/${createdId}`);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assemble a band"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[26px] border border-hairline bg-surface-sheet p-5 pb-6 shadow-[0_-30px_60px_-30px_#000] rise sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline-strong sm:hidden" />

        {/* header lockup */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-ink-near shadow-[0_10px_30px_-10px_var(--accent)]">
              <UsersIcon size={18} />
            </span>
            <div className="min-w-0">
              <Mono className="block text-[10px] font-bold text-amber-300">Backline</Mono>
              <p className="truncate font-semibold text-text-hi">
                {phase === "form" ? "Assemble a band" : "Project's live"}
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

            {/* name (auto, editable — no naming gate) */}
            <div>
              <Mono className="text-[11px] text-text-lo">Project name</Mono>
              <input
                type="text"
                value={nameTouched ? name : autoName}
                onFocus={() => {
                  if (!nameTouched) {
                    setNameTouched(true);
                    setName(autoName);
                  }
                }}
                onChange={(e) => setName(e.target.value)}
                aria-label="Project name"
                className="mt-2 w-full rounded-xl border border-hairline-strong bg-surface-900 px-3 py-2.5 text-sm text-text-hi transition-colors focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* playing this one? */}
            <div>
              <Mono className="text-[11px] text-text-lo">Playing this one?</Mono>
              <div className="mt-2 flex gap-2">
                <Chip active={playing} onClick={() => setPlaying(true)}>
                  🎸 I&apos;m playing
                </Chip>
                <Chip active={!playing} onClick={() => setPlaying(false)}>
                  📝 Just organizing
                </Chip>
              </div>
              {playing ? (
                <div className="no-scrollbar -mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5 pb-1">
                  {INSTRUMENTS.map((ins) => (
                    <Chip
                      key={ins.id}
                      active={myInstrument === ins.id}
                      onClick={() => setMyInstrument(ins.id)}
                    >
                      <InstrumentIcon instrument={ins.id} size={13} />
                      {ins.short}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[11px] leading-relaxed text-text-lo">
                  You&apos;ll run the project as a non-performing organizer — writer,
                  producer, bandleader. Your seat doesn&apos;t count toward the lineup.
                </p>
              )}
            </div>

            {/* seats */}
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <Mono className="text-[11px] text-text-lo">Seats to fill</Mono>
                {seats.length > 0 && (
                  <Mono className="text-[10px] text-amber-300">
                    {seats.length} {seats.length === 1 ? "seat" : "seats"}
                  </Mono>
                )}
              </div>
              <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
                {INSTRUMENTS.map((ins) => (
                  <Chip
                    key={ins.id}
                    active={seats.includes(ins.id)}
                    onClick={() => toggleSeat(ins.id)}
                  >
                    <InstrumentIcon instrument={ins.id} size={13} />
                    {ins.short}
                  </Chip>
                ))}
              </div>
            </div>

            {/* fee per seat */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <Mono className="text-[11px] text-text-lo">Fee per seat (take-home)</Mono>
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
                  aria-label="Fee per seat"
                  className="w-full rounded-xl border border-hairline-strong bg-surface-900 py-2.5 pr-3 pl-7 text-sm text-text-hi transition-colors placeholder:text-text-lo focus:border-amber-500 focus:outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-text-lo">
                Offered per player in their 1:1 thread. The group chat only ever
                sees locks — never a number.
              </p>
            </div>

            {/* note */}
            <div>
              <Mono className="text-[11px] text-text-lo">Add a note (optional)</Mono>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Original set, charts ready, one rehearsal Thursday…"
                className="mt-2 w-full resize-none rounded-xl border border-hairline-strong bg-surface-900 px-3 py-2.5 text-sm text-text-hi transition-colors placeholder:text-text-lo focus:border-amber-500 focus:outline-none"
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!canCreate}
              onClick={create}
            >
              <UsersIcon size={18} />
              {canCreate
                ? `Assemble — post ${seats.length} ${seats.length === 1 ? "seat" : "seats"}`
                : seats.length === 0
                  ? "Pick the seats you need"
                  : !scheduled
                    ? "Add a date and time"
                    : "Add a fee per seat"}
            </Button>
          </div>
        )}

        {/* ------------------------------------------------------------ sent */}
        {phase === "sent" && (
          <div className="mt-6 flex flex-col items-center gap-3 py-2 text-center">
            <SuccessCheck size={60} />
            <div>
              <p className="text-lg font-semibold text-text-hi">{finalName}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-mid">
                {seats.length} {seats.length === 1 ? "seat" : "seats"} posted. When a
                player is held, they join the roster — and the group chat spins up
                on the first lock.
              </p>
            </div>

            <div className="mt-1 w-full rounded-2xl border border-hairline-strong bg-surface-900 p-3.5 text-left">
              <div className="flex items-center gap-2.5">
                <Avatar name={finalName} seed={77} size={32} square />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-hi">{finalName}</p>
                  <Mono className="truncate text-[10px] text-text-lo">
                    {playing
                      ? `You're on ${instrumentInfo(myInstrument).label.toLowerCase()}`
                      : "You're organizing"}
                    {" · "}
                    {scheduled?.label}
                  </Mono>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-hairline-subtle pt-3">
                {seats.map((s) => (
                  <Chip key={s}>
                    <InstrumentIcon instrument={s} size={13} />
                    {instrumentInfo(s).short} · open
                  </Chip>
                ))}
              </div>
            </div>

            <div className="mt-2 grid w-full grid-cols-2 gap-2">
              <Button variant="secondary" size="md" className="w-full" onClick={onClose}>
                Done
              </Button>
              <Button variant="primary" size="md" className="w-full" onClick={viewProject}>
                View project →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
