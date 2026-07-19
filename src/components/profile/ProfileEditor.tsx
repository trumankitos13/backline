import { useState, type ChangeEvent, type FormEvent } from "react";
import type { CurrentUser, InstrumentId, Reel } from "../../lib/types";
import { INSTRUMENTS } from "../../lib/instruments";
import { parseReelUrl } from "../../lib/reels";
import { Avatar, Button, Card, Mono } from "../ui";
import { CheckIcon, CloseIcon, InstrumentIcon, PlusIcon } from "../icons";

const INPUT = "w-full rounded-xl border border-hairline-strong bg-surface-800 px-3.5 py-2.5 text-sm text-text-hi outline-none transition-colors placeholder:text-text-faint focus:border-amber-500";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function splitList(value: string, limit: number, itemLength: number): string[] {
  return Array.from(new Set(
    value
      .split(/[\n,]/)
      .map((item) => item.trim().slice(0, itemLength))
      .filter(Boolean),
  )).slice(0, limit);
}

export function ProfileEditor({
  user,
  onCancel,
  onSave,
  onUploadAvatar,
}: {
  user: CurrentUser;
  onCancel: () => void;
  onSave: (patch: Partial<CurrentUser>) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<string>;
}) {
  const [name, setName] = useState(user.name);
  const [handle, setHandle] = useState(user.handle);
  const [neighborhood, setNeighborhood] = useState(user.neighborhood);
  const [bio, setBio] = useState(user.bio ?? "");
  const [genres, setGenres] = useState((user.genres ?? []).join(", "));
  const [gear, setGear] = useState((user.gear ?? []).join("\n"));
  const [rateMin, setRateMin] = useState(String(user.rate?.min ?? 0));
  const [rateMax, setRateMax] = useState(String(user.rate?.max ?? 0));
  const [instruments, setInstruments] = useState<InstrumentId[]>(user.instruments);
  const [availability, setAvailability] = useState(user.availability ?? []);
  const [reels, setReels] = useState<Reel[]>(user.reels ?? []);
  const [reelUrl, setReelUrl] = useState("");
  const [reelCaption, setReelCaption] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInstrument = (id: InstrumentId) => {
    setInstruments((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

  const toggleDay = (day: string) => {
    setAvailability((current) => current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day]);
  };

  const addReel = () => {
    setError(null);
    const parsed = parseReelUrl(reelUrl);
    if (!parsed) {
      setError("Paste a public TikTok or YouTube video link.");
      return;
    }
    if (reels.some((reel) => reel.url === parsed.canonicalUrl)) {
      setError("That reel is already on your profile.");
      return;
    }
    if (reels.length >= 6) {
      setError("Profiles can feature up to six reels.");
      return;
    }
    setReels((current) => [
      ...current,
      {
        id: `reel-${Date.now()}`,
        platform: parsed.platform,
        url: parsed.canonicalUrl,
        caption: reelCaption.trim() || undefined,
      },
    ]);
    setReelUrl("");
    setReelCaption("");
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError(null);
    if (!IMAGE_TYPES.has(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar images must be 2 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      setAvatarUrl(await onUploadAvatar(file));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Avatar upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const cleanName = name.trim();
    const cleanHandle = handle.trim().toLowerCase();
    const min = Number(rateMin);
    const max = Number(rateMax);
    if (cleanName.length < 2) {
      setError("Enter the name you use on the scene.");
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(cleanHandle)) {
      setError("Handles need 3–30 lowercase letters, numbers, or underscores.");
      return;
    }
    if (instruments.length === 0) {
      setError("Pick at least one instrument or stage role.");
      return;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
      setError("Set a valid rate range with the maximum at or above the minimum.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: cleanName,
        handle: cleanHandle,
        neighborhood: neighborhood.trim(),
        bio: bio.trim(),
        genres: splitList(genres, 8, 40),
        gear: splitList(gear, 12, 120),
        rate: { min: Math.round(min), max: Math.round(max) },
        instruments,
        availability,
        reels,
        avatarUrl,
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Profile save failed.";
      setError(message.includes("profiles_handle_key") ? "That handle is already taken." : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-5 overflow-hidden border-amber-500/25">
      <div className="border-b border-hairline-subtle bg-[radial-gradient(circle_at_top_left,rgba(255,138,61,0.13),transparent_48%)] p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <Avatar name={name || user.name} seed={99} src={avatarUrl} size={72} />
          <div className="min-w-0 flex-1">
            <Mono className="text-[10px] font-bold text-amber-300">Profile soundcheck</Mono>
            <h2 className="mt-1 text-lg font-bold tracking-tight">Make your player card bookable</h2>
            <p className="mt-1 text-xs leading-relaxed text-text-lo">
              This is what Austin and Nashville see when you appear in search.
            </p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-hairline-strong bg-surface-800 px-3 py-2 text-xs font-medium text-text-mid hover:text-text-hi">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadAvatar}
                disabled={uploading}
                className="sr-only"
              />
              <PlusIcon size={14} />
              {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Add photo"}
            </label>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-6 p-4 sm:p-5">
        <section>
          <Mono className="mb-3 block text-[10px] font-bold text-text-lo">Identity</Mono>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-text-mid">
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} className={`${INPUT} mt-1.5`} />
            </label>
            <label className="text-xs text-text-mid">
              Handle
              <div className="relative mt-1.5">
                <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-text-lo">@</span>
                <input
                  value={handle}
                  onChange={(event) => setHandle(event.target.value.replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  maxLength={30}
                  spellCheck={false}
                  className={`${INPUT} pl-8`}
                />
              </div>
            </label>
          </div>
          <label className="mt-3 block text-xs text-text-mid">
            Neighborhood
            <input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} maxLength={80} placeholder="East Nashville" className={`${INPUT} mt-1.5`} />
          </label>
          <label className="mt-3 block text-xs text-text-mid">
            Bio
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={4} placeholder="What do you play, and what kind of calls are you looking for?" className={`${INPUT} mt-1.5 resize-none`} />
            <span className="mt-1 block text-right text-[10px] text-text-faint">{bio.length}/500</span>
          </label>
        </section>

        <section>
          <Mono className="mb-3 block text-[10px] font-bold text-text-lo">Your roles</Mono>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {INSTRUMENTS.map((item) => {
              const selected = instruments.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleInstrument(item.id)}
                  aria-pressed={selected}
                  className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-[11px] transition-colors ${selected ? "border-amber-500/60 bg-amber-500/10 text-amber-300" : "border-hairline-subtle bg-surface-800 text-text-mid"}`}
                >
                  {selected && <CheckIcon size={11} className="absolute top-2 right-2" />}
                  <InstrumentIcon instrument={item.id} size={19} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-text-mid">
            Genres <span className="text-text-faint">· comma separated</span>
            <input value={genres} onChange={(event) => setGenres(event.target.value)} maxLength={400} placeholder="Country, Soul, Indie" className={`${INPUT} mt-1.5`} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-text-mid">
              Rate from
              <input type="number" min="0" max="100000" inputMode="numeric" value={rateMin} onChange={(event) => setRateMin(event.target.value)} className={`${INPUT} mt-1.5`} />
            </label>
            <label className="text-xs text-text-mid">
              Rate to
              <input type="number" min="0" max="100000" inputMode="numeric" value={rateMax} onChange={(event) => setRateMax(event.target.value)} className={`${INPUT} mt-1.5`} />
            </label>
          </div>
          <label className="text-xs text-text-mid sm:col-span-2">
            Gear <span className="text-text-faint">· one item per line</span>
            <textarea value={gear} onChange={(event) => setGear(event.target.value)} maxLength={1500} rows={3} placeholder={"Fender Deluxe Reverb\nGretsch kit\nIn-ear rig"} className={`${INPUT} mt-1.5 resize-none`} />
          </label>
        </section>

        <section>
          <Mono className="mb-3 block text-[10px] font-bold text-text-lo">Usually free</Mono>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((day) => {
              const selected = availability.includes(day);
              return (
                <button key={day} type="button" onClick={() => toggleDay(day)} aria-pressed={selected} className={`rounded-lg border py-2 text-[10px] font-bold ${selected ? "border-cyan-400/45 bg-cyan-400/10 text-cyan-300" : "border-hairline-subtle bg-surface-800 text-text-lo"}`}>
                  {day}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <Mono className="block text-[10px] font-bold text-text-lo">Featured reels</Mono>
              <p className="mt-1 text-xs text-text-lo">Public TikTok and YouTube links · up to six</p>
            </div>
            <Mono className="text-[10px] text-text-faint">{reels.length}/6</Mono>
          </div>
          {reels.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {reels.map((reel) => (
                <div key={reel.id} className="flex items-center gap-3 rounded-xl border border-hairline-subtle bg-surface-800 p-3">
                  <Mono className="shrink-0 text-[9px] text-cyan-300">{reel.platform}</Mono>
                  <p className="min-w-0 flex-1 truncate text-xs text-text-mid">{reel.caption || reel.url}</p>
                  <button type="button" onClick={() => setReels((current) => current.filter((item) => item.id !== reel.id))} aria-label="Remove reel" className="rounded-lg p-1.5 text-text-lo hover:bg-surface-raised hover:text-text-hi">
                    <CloseIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input value={reelUrl} onChange={(event) => setReelUrl(event.target.value)} placeholder="https://youtube.com/shorts/…" inputMode="url" className={INPUT} />
            <input value={reelCaption} onChange={(event) => setReelCaption(event.target.value)} maxLength={120} placeholder="Caption (optional)" className={INPUT} />
            <Button type="button" variant="secondary" onClick={addReel} disabled={!reelUrl.trim()}>
              Add reel
            </Button>
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-xl border border-[color-mix(in_srgb,var(--color-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-danger)]">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-hairline-subtle pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving || uploading}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </Card>
  );
}
