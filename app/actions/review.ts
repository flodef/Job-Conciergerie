'use server';

import { deleteReview, getReview, upsertReview, type Review } from '@/app/db/reviewDb';
import { requireConnectedSession } from '@/app/db/session';

const MAX_COMMENT_LENGTH = 500;

/**
 * The authenticated user's own review, or null when none exists yet.
 */
export async function getMyReview(): Promise<Review | null> {
  const session = await requireConnectedSession();
  if (!session) return null;
  return await getReview(session.userType, session.rowKey);
}

/**
 * Create or update the authenticated user's review (one review per person,
 * enforced by the table's primary key). Returns the saved review.
 */
export async function saveMyReview(rating: number, comment: string, isPublic: boolean): Promise<Review | null> {
  const session = await requireConnectedSession();
  if (!session) return null;

  if (!Number.isInteger(rating) || rating < 0 || rating > 5) return null;
  const trimmed = comment.trim().slice(0, MAX_COMMENT_LENGTH);
  if (rating === 0 && !trimmed) return null; // nothing worth persisting

  return await upsertReview(session.userType, session.rowKey, rating, trimmed, isPublic);
}

/**
 * Delete the authenticated user's own review.
 */
export async function deleteMyReview(): Promise<boolean> {
  const session = await requireConnectedSession();
  if (!session) return false;
  return await deleteReview(session.userType, session.rowKey);
}
