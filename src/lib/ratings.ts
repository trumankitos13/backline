// Uber-style rating summaries for musicians. Event apps show a prominent average
// star rating with a total count (many more ratings than written reviews), plus
// a distribution. We derive all of it deterministically from a musician's
// existing fields (written reviews, gigsPlayed, verified, seed) so the numbers
// are believable and stable without hand-authoring them per musician.

import type { Player } from "./types";

export interface RatingSummary {
  /** average, 0..5, one decimal */
  avg: number;
  /** total number of star ratings (>= written reviews) */
  count: number;
  /** counts per star, index 0 = 5★ … index 4 = 1★ */
  breakdown: [number, number, number, number, number];
}

function seededRand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute a musician's rating summary. Includes any extra ratings the user has
 * submitted this session (post-gig), passed in as `extra`.
 */
export function ratingSummary(m: Player, extra: number[] = []): RatingSummary {
  const rand = seededRand(m.seed * 2654435761);

  // baseline average: written reviews if any, else seed-based 4.5–5.0,
  // nudged up for verified pros.
  const reviewAvg =
    m.reviews.length > 0
      ? m.reviews.reduce((s, r) => s + r.rating, 0) / m.reviews.length
      : 4.5 + rand() * 0.5;
  const base = Math.min(5, reviewAvg + (m.verified ? 0.15 : 0) - rand() * 0.1);

  // total ratings: most gigs get rated, floored so newer players still read well
  const count = Math.max(m.reviews.length, Math.round(m.gigsPlayed * (0.55 + rand() * 0.2)) || 3);

  // distribution consistent with the average, skewed high
  const breakdown: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const p5 = Math.min(0.95, Math.max(0.4, (base - 3.4) / 1.6));
  const weights = [p5, (1 - p5) * 0.6, (1 - p5) * 0.25, (1 - p5) * 0.1, (1 - p5) * 0.05];
  let assigned = 0;
  for (let i = 0; i < 5; i++) {
    const n = i === 4 ? count - assigned : Math.round(count * weights[i]);
    breakdown[i] = Math.max(0, n);
    assigned += breakdown[i];
  }

  // fold in this session's post-gig ratings
  for (const stars of extra) {
    const idx = 5 - Math.round(stars);
    if (idx >= 0 && idx < 5) breakdown[idx] += 1;
  }

  const total = breakdown.reduce((s, n) => s + n, 0);
  const weighted = breakdown.reduce((s, n, i) => s + n * (5 - i), 0);
  const avg = total > 0 ? weighted / total : base;

  return { avg: Math.round(avg * 10) / 10, count: total, breakdown };
}

/** compact label like "4.9" */
export function ratingLabel(avg: number): string {
  return avg.toFixed(1);
}
