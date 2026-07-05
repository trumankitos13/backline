import type { InstrumentId } from "./types";

export interface InstrumentInfo {
  id: InstrumentId;
  label: string;
  /** short label for tight chips */
  short: string;
  emoji: string;
}

export const INSTRUMENTS: InstrumentInfo[] = [
  { id: "guitar", label: "Guitar", short: "Gtr", emoji: "🎸" },
  { id: "bass", label: "Bass", short: "Bass", emoji: "🎸" },
  { id: "drums", label: "Drums", short: "Drums", emoji: "🥁" },
  { id: "keys", label: "Keys / Piano", short: "Keys", emoji: "🎹" },
  { id: "vocals", label: "Vocals", short: "Vox", emoji: "🎤" },
  { id: "sax", label: "Saxophone", short: "Sax", emoji: "🎷" },
  { id: "trumpet", label: "Trumpet", short: "Tpt", emoji: "🎺" },
  { id: "violin", label: "Violin / Fiddle", short: "Vln", emoji: "🎻" },
  { id: "pedal-steel", label: "Pedal Steel", short: "Steel", emoji: "🛤️" },
  { id: "dj", label: "DJ / Electronic", short: "DJ", emoji: "🎧" },
  { id: "sound-tech", label: "Sound Tech", short: "FOH", emoji: "🎚️" },
  { id: "lighting-tech", label: "Lighting Tech", short: "LX", emoji: "💡" },
];

const byId = new Map(INSTRUMENTS.map((i) => [i.id, i]));

export function instrument(id: InstrumentId): InstrumentInfo {
  return byId.get(id)!;
}

export function instrumentLabel(id: InstrumentId): string {
  return byId.get(id)?.label ?? id;
}
