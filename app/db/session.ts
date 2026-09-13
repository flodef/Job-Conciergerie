import { hmacSecret, rotateLegacyId, sql } from '@/app/db/db';
import type { UserType } from '@/app/contexts/authProvider';
import { baseId, V2_ID_PREFIX } from '@/app/utils/id';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const USER_ID_COOKIE = 'user_id';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, same as the client-side cookie

export interface SessionUser {
  /** Canonical credential id (rotated v2 form when a legacy id was migrated). */
  userId: string;
  userType: UserType;
  /** True when the session id was rotated from a legacy id during this call. */
  rotated: boolean;
}

/**
 * Raw `user_id` cookie value (device id), without DB membership check.
 * Used by the enrollment flows where the device is not registered yet.
 */
export async function getSessionDeviceId(): Promise<string | null> {
  try {
    const raw = (await cookies()).get(USER_ID_COOKIE)?.value?.trim();
    return raw ? baseId(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Resolve which user type a credential id belongs to.
 * Matches `containsId` semantics: the '$' pending-device marker is ignored.
 */
async function resolveUserType(id: string): Promise<UserType | null> {
  try {
    const result = await sql`
      SELECT CASE
        WHEN EXISTS (
          SELECT 1 FROM conciergeries c
          WHERE EXISTS (SELECT 1 FROM unnest(c.id) d WHERE replace(d, '$', '') = ${id})
        ) THEN 'conciergerie'
        WHEN EXISTS (
          SELECT 1 FROM employees e
          WHERE EXISTS (SELECT 1 FROM unnest(e.id) d WHERE replace(d, '$', '') = ${id})
        ) THEN 'employee'
        ELSE NULL
      END AS user_type
    `;

    return (result[0]?.user_type as UserType) ?? null;
  } catch (error) {
    console.error('Error resolving session user:', error);
    return null;
  }
}

/**
 * Resolve the session from the `user_id` cookie.
 *
 * Transparent legacy-id migration: when the cookie holds a legacy (Math.random) id,
 * the matching row is rewritten in place with the deterministic v2 id and the cookie
 * is updated — users are migrated on their next request without noticing. A stale
 * legacy cookie self-heals: if the row already holds the rotated id, it is found
 * through the derived-id lookup.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const id = await getSessionDeviceId();
  if (!id) return null;

  let userType = await resolveUserType(id);
  let canonicalId = id;

  // Stale-cookie fallback: the row may already hold the rotated id
  if (!userType && !id.startsWith(V2_ID_PREFIX)) {
    const rotated = rotateLegacyId(id);
    if (rotated !== id && (userType = await resolveUserType(rotated))) canonicalId = rotated;
  }
  if (!userType) return null;

  // Lazy rotation: rewrite the legacy id in place (idempotent — v2 is deterministic)
  if (!canonicalId.startsWith(V2_ID_PREFIX)) {
    const rotated = rotateLegacyId(canonicalId);
    if (rotated !== canonicalId) {
      try {
        await sql`
          UPDATE conciergeries
          SET id = array_replace(array_replace(id, ${canonicalId}, ${rotated}), ${'$' + canonicalId}, ${'$' + rotated})
          WHERE ${canonicalId} = ANY(id) OR ${'$' + canonicalId} = ANY(id)
        `;
        await sql`
          UPDATE employees
          SET id = array_replace(array_replace(id, ${canonicalId}, ${rotated}), ${'$' + canonicalId}, ${'$' + rotated})
          WHERE ${canonicalId} = ANY(id) OR ${'$' + canonicalId} = ANY(id)
        `;
      } catch (error) {
        console.error('Error rotating legacy user id:', error);
        return { userId: canonicalId, userType, rotated: false };
      }

      try {
        (await cookies()).set(USER_ID_COOKIE, rotated, {
          path: '/',
          maxAge: COOKIE_MAX_AGE,
          sameSite: 'lax',
        });
      } catch {
        // Read-only context — the client syncs through the syncSession response
      }
      return { userId: rotated, userType, rotated: true };
    }
  }

  return { userId: canonicalId, userType, rotated: false };
}

/**
 * All credential forms acceptable for the current caller: the raw cookie id, its
 * rotated derivation, and the canonical session id. Covers every ordering of the
 * lazy rotation relative to in-flight requests.
 */
export async function getSessionCredentialIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  const deviceId = await getSessionDeviceId();
  if (deviceId) {
    ids.add(deviceId);
    ids.add(rotateLegacyId(deviceId));
  }
  const session = await getSessionUser();
  if (session) ids.add(session.userId);
  return ids;
}

// ------------------------------------------------------------------
// Enrollment tokens — proof that a non-member caller received the email.
// Stateless signed token: `${expiresAt}.${hmac}` binding (kind | row | device).
// ------------------------------------------------------------------

const ENROLL_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days — emails may sit unread

const enrollmentPayload = (kind: string, rowKey: string, deviceId: string, exp: number) =>
  `enroll|${kind}|${rowKey}|${deviceId}|${exp}`;

/**
 * Issue an enrollment token for a device in a verification email link.
 * Returns '' when no signing secret is configured (enrollment then fails closed).
 */
export function enrollmentToken(kind: 'employee' | 'conciergerie', rowKey: string, deviceId: string): string {
  const key = hmacSecret();
  if (!key) return '';
  const exp = Math.floor(Date.now() / 1000) + ENROLL_TOKEN_TTL;
  const sig = createHmac('sha256', key)
    .update(enrollmentPayload(kind, rowKey, deviceId, exp))
    .digest('hex')
    .slice(0, 32);
  return `${exp}.${sig}`;
}

/**
 * Verify an enrollment token for a non-member enrolling into `rowKey` with `deviceId`.
 */
export function verifyEnrollmentToken(
  kind: 'employee' | 'conciergerie',
  rowKey: string,
  deviceId: string,
  token: string | undefined,
): boolean {
  const key = hmacSecret();
  if (!key || !token) return false;

  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!exp || !sig || exp < Math.floor(Date.now() / 1000)) return false;

  const expected = createHmac('sha256', key)
    .update(enrollmentPayload(kind, rowKey, deviceId, exp))
    .digest('hex')
    .slice(0, 32);
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/**
 * Validate a device-ids array update against the session: only a connected device
 * of the row may update it, and every resulting id must already belong to the row
 * or be the session credential itself (approve/remove/reorder own devices).
 * New-device enrollment goes through the `enroll*Device` actions, which compute
 * the array server-side — clients never craft it.
 */
export function isValidDeviceIdsUpdate(oldIds: string[], newIds: string[], sessionIds: Set<string>): boolean {
  const oldBase = oldIds.map(baseId);
  const oldConnected = oldIds.filter(i => !i.startsWith('$')).map(baseId);
  if (!oldConnected.some(i => sessionIds.has(i))) return false;
  return newIds.map(baseId).every(i => oldBase.includes(i) || sessionIds.has(i));
}
