import { sql } from '@/app/db/db';
import type { UserType } from '@/app/contexts/authProvider';

/**
 * Per-person reviews: one row per (user_type, row_key), editable and deletable
 * at any time. Callers must derive the identity from the session (rowKey) —
 * never from client input.
 * The table is created lazily — see migrations/create_reviews.sql.
 */

export interface DbReview {
  user_type: UserType;
  row_key: string;
  rating: number;
  comment: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Review {
  rating: number;
  comment: string;
  isPublic: boolean;
  updatedAt: string;
}

let tableReady: Promise<unknown> | null = null;
export const ensureReviewsTable = () =>
  (tableReady ??= sql`
    CREATE TABLE IF NOT EXISTS reviews (
      user_type text NOT NULL CHECK (user_type IN ('conciergerie', 'employee')),
      row_key text NOT NULL,
      rating smallint NOT NULL CHECK (rating BETWEEN 0 AND 5),
      comment text NOT NULL DEFAULT '',
      is_public boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_type, row_key)
    )
  `);

const formatReview = (row: DbReview): Review => ({
  rating: row.rating,
  comment: row.comment,
  isPublic: row.is_public,
  updatedAt: row.updated_at,
});

export const getReview = async (userType: UserType, rowKey: string): Promise<Review | null> => {
  try {
    await ensureReviewsTable();
    const result = await sql<DbReview[]>`
      SELECT rating, comment, is_public, updated_at FROM reviews
      WHERE user_type = ${userType} AND row_key = ${rowKey}
    `;
    return result.length > 0 ? formatReview(result[0]) : null;
  } catch (error) {
    console.error('Error fetching review:', error);
    return null;
  }
};

export const upsertReview = async (
  userType: UserType,
  rowKey: string,
  rating: number,
  comment: string,
  isPublic: boolean,
): Promise<Review | null> => {
  try {
    await ensureReviewsTable();
    const result = await sql<DbReview[]>`
      INSERT INTO reviews (user_type, row_key, rating, comment, is_public)
      VALUES (${userType}, ${rowKey}, ${rating}, ${comment}, ${isPublic})
      ON CONFLICT (user_type, row_key)
      DO UPDATE SET
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        is_public = EXCLUDED.is_public,
        updated_at = now()
      RETURNING rating, comment, is_public, updated_at
    `;
    return result.length > 0 ? formatReview(result[0]) : null;
  } catch (error) {
    console.error('Error upserting review:', error);
    return null;
  }
};

export const deleteReview = async (userType: UserType, rowKey: string): Promise<boolean> => {
  try {
    await ensureReviewsTable();
    const result = await sql`
      DELETE FROM reviews WHERE user_type = ${userType} AND row_key = ${rowKey}
    `;
    return result.count > 0;
  } catch (error) {
    console.error('Error deleting review:', error);
    return false;
  }
};

/**
 * Public testimonials for the landing — reviews the author marked as public
 * and that have a comment, best first (highest rating, then most recent).
 * row_key doubles as the public author name: conciergerie name or employee
 * "firstName familyName".
 */
export const getTopReviews = async (limit = 3): Promise<DbReview[]> => {
  try {
    await ensureReviewsTable();
    const result = await sql<DbReview[]>`
      SELECT user_type, row_key, rating, comment, is_public, updated_at FROM reviews
      WHERE comment <> '' AND is_public
      ORDER BY rating DESC, updated_at DESC
      LIMIT ${limit}
    `;
    return result;
  } catch (error) {
    console.error('Error fetching top reviews:', error);
    return [];
  }
};

/**
 * Public aggregate — average rating and review count, for the landing stats.
 * Returns null when there is no review yet.
 */
export const getReviewStats = async (): Promise<{ average: number; count: number } | null> => {
  try {
    await ensureReviewsTable();
    const result = await sql`
      SELECT AVG(rating)::float8 AS average, COUNT(*)::int AS count FROM reviews
    `;
    const row = result[0];
    return row && row.count > 0 ? { average: row.average, count: row.count } : null;
  } catch (error) {
    console.error('Error fetching review stats:', error);
    return null;
  }
};
