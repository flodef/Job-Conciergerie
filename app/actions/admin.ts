'use server';

import { sql } from '@/app/db/db';
import {
  impersonateCookieMaxAge,
  impersonateCookieName,
  impersonationToken,
  requireConnectedSession,
} from '@/app/db/session';
import type { UserType } from '@/app/contexts/authProvider';
import { cookies } from 'next/headers';

export interface ImpersonationTarget {
  userType: UserType;
  rowKey: string;
}

/**
 * Start viewing the app as another row. Admin sessions only — the signed
 * `impersonate` cookie is honored by getSessionUser for IMPERSONATE_TTL.
 */
export async function startImpersonation(userType: UserType, rowKey: string): Promise<boolean> {
  const session = await requireConnectedSession();
  if (!session?.isAdmin) return false;

  // Only rows that actually exist can be impersonated.
  const target = (await getImpersonationTargets()).find(t => t.userType === userType && t.rowKey === rowKey);
  if (!target) return false;

  const value = impersonationToken(userType, rowKey);
  if (!value) return false;

  (await cookies()).set(impersonateCookieName, value, {
    path: '/',
    maxAge: impersonateCookieMaxAge,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  console.warn(`[admin] ${session.rowKey} started impersonating ${userType} "${rowKey}"`);
  return true;
}

/**
 * Stop impersonating — back to the real admin session.
 */
export async function stopImpersonation(): Promise<boolean> {
  const session = await requireConnectedSession();
  if (!session) return false;
  (await cookies()).delete(impersonateCookieName);
  // While impersonating, session.rowKey is the TARGET's — log it as such.
  console.warn(
    session.impersonating
      ? `[admin] stopped impersonating ${session.userType} "${session.rowKey}"`
      : `[admin] ${session.rowKey} stopped impersonating`,
  );
  return true;
}

/**
 * Every impersonable row (all conciergeries + employees, unscoped).
 * Names only — the picker never needs device ids. Admin sessions only.
 */
export async function getImpersonationTargets(): Promise<ImpersonationTarget[]> {
  const session = await requireConnectedSession();
  if (!session?.isAdmin) return [];

  const rows = await sql`
    SELECT 'conciergerie' AS user_type, name AS row_key FROM conciergeries
    UNION ALL
    SELECT 'employee', first_name || ' ' || family_name FROM employees
    WHERE status IS NULL OR status <> 'deleted'
    ORDER BY 2`;
  return rows.map(r => ({ userType: r.user_type as UserType, rowKey: r.row_key as string }));
}
