// Rating summaries use only actual review values plus ratings submitted during
// the current session. Account/avatar seeds must never create synthetic trust.

import type { Player } from "./types";

export interface RatingSummary {
  /** average, 0..5, one decimal */
  avg: number;
  /** total number of star ratings (>= written reviews) */
  count: number;
  /** counts per star, index 0 = 5★ … index 4 = 1★ */
  breakdown: [number, number, number, number, number];
}

/**
 * Compute a musician's rating summary. Includes any extra ratings the user has
 * submitted this session (post-gig), passed in as `extra`.
 */
export function ratingSummary(m: Player, extra: number[] = []): RatingSummary {
  const ratings = [
    ...m.reviews.map((review) => review.rating),
    ...extra,
  ].filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
  if (ratings.length === 0) {
    return { avg: 0, count: 0, breakdown: [0, 0, 0, 0, 0] };
  }

  const breakdown: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const stars of ratings) {
    const idx = 5 - Math.round(stars);
    if (idx >= 0 && idx < 5) breakdown[idx] += 1;
  }

  const count = breakdown.reduce((sum, value) => sum + value, 0);
  const weighted = breakdown.reduce((sum, value, index) => sum + value * (5 - index), 0);
  const avg = weighted / count;

  return { avg: Math.round(avg * 10) / 10, count, breakdown };
}

/** compact label like "4.9" */
export function ratingLabel(avg: number): string {
  return avg.toFixed(1);
}
