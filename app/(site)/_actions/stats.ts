'use server';

import { sql } from '@/app/db/db';
import { getReviewStats, getTopReviews } from '@/app/db/reviewDb';

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
    sql`SELECT COUNT(*)::int AS count FROM missions`.then(
      r => r[0].count as number,
      () => 0,
    ),
    sql`SELECT COUNT(*)::int AS count FROM homes`.then(
      r => r[0].count as number,
      () => 0,
    ),
    getReviewStats(),
  ]);

  return {
    missionCount: missions,
    homeCount: homes,
    averageRating: reviews?.average ?? null,
  };
}

export interface PublicTestimonial {
  name: string;
  role: string;
  text: string;
  stars: number;
}

// "Jean Dupont" → "Jean D." — employees stay semi-anonymous in public.
const shortName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

/**
 * Real user reviews for the landing testimonials — best rated, most recent
 * first. Only reviews with a comment qualify. Returns [] when none exist so
 * the caller can fall back to placeholder testimonials.
 */
export async function getPublicTestimonials(limit = 3): Promise<PublicTestimonial[]> {
  const reviews = await getTopReviews(limit);
  return reviews.map(r => ({
    name: r.user_type === 'employee' ? shortName(r.row_key) : r.row_key,
    role: r.user_type === 'employee' ? 'Prestataire' : 'Conciergerie',
    text: r.comment,
    stars: r.rating,
  }));
}
