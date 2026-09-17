'use server';

import { sql } from '@/app/db/db';
import { getReviewStats } from '@/app/db/reviewDb';

export interface LandingStats {
  missionCount: number;
  homeCount: number;
  /** Average of all submitted reviews (0–5), or null when none exist yet. */
  averageRating: number | null;
}

/**
 * Live counts for the landing page stats bar. Public and unauthenticated —
 * aggregates only, no row data. Queries are independent so one failing table
 * doesn't take the whole bar down.
 */
export async function getLandingStats(): Promise<LandingStats> {
  const [missions, homes, reviews] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM missions`.then(r => r[0].count as number, () => 0),
    sql`SELECT COUNT(*)::int AS count FROM homes`.then(r => r[0].count as number, () => 0),
    getReviewStats(),
  ]);

  return {
    missionCount: missions,
    homeCount: homes,
    averageRating: reviews?.average ?? null,
  };
}
