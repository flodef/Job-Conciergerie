'use server';

import { getSessionUser, type SessionUser } from '@/app/db/session';

/**
 * Resolve the current session and rotate legacy credentials.
 * Called by the auth provider on every data refresh so the client can converge
 * its localStorage/cookie to the canonical (rotated) id.
 */
export async function syncSession(): Promise<Pick<SessionUser, 'userId' | 'userType'> | null> {
  const session = await getSessionUser();
  return session ? { userId: session.userId, userType: session.userType } : null;
}
