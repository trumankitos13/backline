// Backline's two signature generative systems — deterministic, seed-based, and
// used everywhere instead of stock photos so the product feels owned even for
// brand-new users. Both derive from a hash of a stable seed (user/reel id).
//
// - fingerprint(seed): the identity mark when a user has no photo.
// - reelGrad(seed):    the video/photo stand-in painted on every reel tile.

/** FNV-1a hash of a string or number seed → unsigned 32-bit. */
function hash(seed: string | number): number {
  const s = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** small deterministic PRNG (mulberry32) seeded from the hash. */
function prng(seedHash: number): () => number {
  let a = seedHash >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// stage-gel hue set (OKLCH hue degrees) — the theatrical lighting palette
const GELS = [42, 20, 352, 320, 278, 258, 196, 168, 128];

export interface FingerprintStyle {
  background: string;
  hueA: number;
  hueB: number;
}

/**
 * Fingerprint avatar: three layered gradients (spokes + rings + base) painted
 * into one CSS `background`. Deterministic per seed.
 */
export function fingerprint(seed: string | number): FingerprintStyle {
  const h = hash(seed);
  const rand = prng(h);
  const hueA = GELS[h % GELS.length];
  const hueB = GELS[Math.floor(h / GELS.length) % GELS.length];
  const angle = Math.floor(rand() * 90);
  const spoke = 7 + Math.floor(rand() * 8); // 7..14
  const x = Math.floor(20 + rand() * 60);
  const y = Math.floor(20 + rand() * 60);

  const spokes = `repeating-conic-gradient(from ${angle}deg at ${x}% ${y}%, oklch(0.66 0.17 ${hueA}) 0deg ${spoke}deg, transparent ${spoke}deg ${2 * spoke}deg)`;
  const rings = `repeating-radial-gradient(circle at ${x}% ${y}%, oklch(0.5 0.14 ${hueB}) 0 1.5px, transparent 1.5px 8px)`;
  const base = `radial-gradient(circle at ${x}% ${y}%, oklch(0.44 0.13 ${hueA}), oklch(0.15 0.05 ${hueB}))`;

  return { background: `${spokes}, ${rings}, ${base}`, hueA, hueB };
}

/**
 * Reel gel: the video/photo stand-in on a reel tile — a rich radial gradient in
 * two seed-derived hues, always anchored on dark.
 */
export function reelGrad(seed: string | number): string {
  const h = hash(seed);
  const rand = prng(h);
  const hueA = GELS[h % GELS.length];
  const hueB = GELS[Math.floor(h / GELS.length) % GELS.length];
  const x = Math.floor(30 + rand() * 40);
  const y = Math.floor(20 + rand() * 40);
  return `radial-gradient(130% 120% at ${x}% ${y}%, oklch(0.64 0.17 ${hueA}) 0%, oklch(0.42 0.16 ${hueA}) 28%, oklch(0.24 0.11 ${hueB}) 62%, oklch(0.13 0.04 ${hueB}) 100%)`;
}

/** deterministic waveform bar heights (0.15..1) for the fullscreen scrubber. */
export function waveform(seed: string | number, count: number): number[] {
  const rand = prng(hash(seed));
  return Array.from({ length: count }, () => 0.15 + rand() * 0.85);
}

/** film-grain overlay as an inline SVG data-URI (no raster asset). */
export const GRAIN_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>`,
  );
