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
  // The proxy compares the user_type cookie against the session's resolved
  // type — while impersonating an employee, /api/auth answers 'employee' and a
  // stale 'conciergerie' cookie would bounce nav pages to /waiting before the
  // client can update it. Keep the hint in sync (JS-readable, the client owns
  // it normally; the authoritative check stays server-side).
  (await cookies()).set('user_type', target.userType, {
    path: '/',
    sameSite: 'lax',
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
  // Restore the routing hint to the real identity — admin accounts are always
  // conciergerie rows (see scripts/create-admin.ts).
  (await cookies()).set('user_type', 'conciergerie', {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
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
 * Admin-client rows are excluded: impersonating the admin's own row is both
 * meaningless (the unscoped view is already available) and broken — admin
 * rows are hidden from fetchConciergeries while impersonating, so the target
 * would never resolve and the app reloads forever. The currently
 * impersonated target is excluded too (it is not a choice to re-pick).
 */
export async function getImpersonationTargets(): Promise<ImpersonationTarget[]> {
  const session = await requireConnectedSession();
  if (!session?.isAdmin) return [];

  const rows = await sql`
    SELECT 'conciergerie' AS user_type, c.name AS row_key
    FROM conciergeries c LEFT JOIN clients cl ON cl.id = c.client_id
    WHERE COALESCE(cl.is_admin, false) = false
    UNION ALL
    SELECT 'employee', e.first_name || ' ' || e.family_name
    FROM employees e LEFT JOIN clients cl ON cl.id = e.client_id
    WHERE (e.status IS NULL OR e.status <> 'deleted')
    AND COALESCE(cl.is_admin, false) = false
    ORDER BY 2`;
  return rows
    .map(r => ({ userType: r.user_type as UserType, rowKey: r.row_key as string }))
    .filter(t => !(session.impersonating && t.userType === session.userType && t.rowKey === session.rowKey));
}
