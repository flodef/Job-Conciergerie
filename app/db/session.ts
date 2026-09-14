import { hashId, hmacSecret, rotateLegacyId, sql } from '@/app/db/db';
import type { UserType } from '@/app/contexts/authProvider';
import { baseId, isNewDevice, V2_ID_PREFIX } from '@/app/utils/id';
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
  /**
   * True when the device is only a pending (`$`-prefixed) member awaiting approval
   * from a connected device or an emailed enrollment token. Pending sessions may
   * read the redacted lists (waiting-page status) but must not mutate data or read
   * protected resources — use `requireConnectedSession` for those.
   */
  pending: boolean;
  /**
   * The session row's business key: conciergerie `name`, or employee
   * `firstName + ' ' + familyName` — the same format stored in `missions.employee_id`.
   * Used to authorize per-resource access (e.g. employees only touch their own missions).
   */
  rowKey: string;
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
 * Resolve which user type a credential id belongs to, and whether the match is
 * only through a pending (`$`-prefixed) device entry. A pending device resolves
 * (so the waiting page works) but carries `pending: true` — no privileges.
 */
async function resolveMembership(id: string): Promise<{ userType: UserType; pending: boolean; rowKey: string } | null> {
  try {
    // Ids are hashed at rest — dual-match (raw OR sha256) keeps pre-migration
    // rows resolving during the transition.
    const hid = hashId(id);
    const pendingId = '$' + id;
    const pendingHid = '$' + hid;
    const result = await sql`
      SELECT
        CASE
          WHEN EXISTS (
            SELECT 1 FROM conciergeries
            WHERE ${id} = ANY(id) OR ${hid} = ANY(id) OR ${pendingId} = ANY(id) OR ${pendingHid} = ANY(id)
          ) THEN 'conciergerie'
          WHEN EXISTS (
            SELECT 1 FROM employees
            WHERE ${id} = ANY(id) OR ${hid} = ANY(id) OR ${pendingId} = ANY(id) OR ${pendingHid} = ANY(id)
          ) THEN 'employee'
          ELSE NULL
        END AS user_type,
        NOT (
          EXISTS (SELECT 1 FROM conciergeries WHERE ${id} = ANY(id) OR ${hid} = ANY(id))
          OR EXISTS (SELECT 1 FROM employees WHERE ${id} = ANY(id) OR ${hid} = ANY(id))
        ) AS pending,
        COALESCE(
          (SELECT name FROM conciergeries
           WHERE ${id} = ANY(id) OR ${hid} = ANY(id) OR ${pendingId} = ANY(id) OR ${pendingHid} = ANY(id) LIMIT 1),
          (SELECT first_name || ' ' || family_name FROM employees
           WHERE ${id} = ANY(id) OR ${hid} = ANY(id) OR ${pendingId} = ANY(id) OR ${pendingHid} = ANY(id) LIMIT 1)
        ) AS row_key
    `;

    const row = result[0];
    return row?.user_type && row.row_key
      ? { userType: row.user_type as UserType, pending: !!row.pending, rowKey: row.row_key as string }
      : null;
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

  let membership = await resolveMembership(id);
  let canonicalId = id;

  // Stale-cookie fallback: the row may already hold the rotated id
  if (!membership && !id.startsWith(V2_ID_PREFIX)) {
    const rotated = rotateLegacyId(id);
    if (rotated !== id && (membership = await resolveMembership(rotated))) canonicalId = rotated;
  }
  if (!membership) return null;
  const { userType, pending, rowKey } = membership;

  // Lazy rotation: rewrite the legacy id in place (idempotent — v2 is deterministic)
  if (!canonicalId.startsWith(V2_ID_PREFIX)) {
    const rotated = rotateLegacyId(canonicalId);
    if (rotated !== canonicalId) {
      try {
        // Rewrite both forms (raw during transition, hash after migration),
        // preserving the pending marker — result is always hashId(rotated).
        const hCanonical = hashId(canonicalId);
        const hRotated = hashId(rotated);
        const rewrite = sql`
          SET id = (
            SELECT array_agg(CASE
              WHEN i IN (${canonicalId}, ${hCanonical}) THEN ${hRotated}
              WHEN i IN (${'$' + canonicalId}, ${'$' + hCanonical}) THEN ${'$' + hRotated}
              ELSE i END)
            FROM unnest(id) i
          )
          WHERE ${canonicalId} = ANY(id) OR ${hCanonical} = ANY(id)
             OR ${'$' + canonicalId} = ANY(id) OR ${'$' + hCanonical} = ANY(id)
        `;
        await sql`UPDATE conciergeries ${rewrite}`;
        await sql`UPDATE employees ${rewrite}`;
      } catch (error) {
        console.error('Error rotating legacy user id:', error);
        return { userId: canonicalId, userType, rotated: false, pending, rowKey };
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
      return { userId: rotated, userType, rotated: true, pending, rowKey };
    }
  }

  return { userId: canonicalId, userType, rotated: false, pending, rowKey };
}

/**
 * Session guard for privileged actions: rejects unauthenticated callers AND
 * pending (`$`) devices awaiting approval. Use `getSessionUser` only for the
 * enrollment/list paths that pending devices legitimately need.
 */
export async function requireConnectedSession(): Promise<SessionUser | null> {
  const session = await getSessionUser();
  return session && !session.pending ? session : null;
}

/** Session guard for actions only a conciergerie may perform. */
export async function requireConciergerieSession(): Promise<SessionUser | null> {
  const session = await requireConnectedSession();
  return session?.userType === 'conciergerie' ? session : null;
}

/**
 * True when the session is a connected member of the row owning `ids`
 * (its canonical device id is a connected entry of the array).
 */
export function isRowMember(session: SessionUser, ids: string[]): boolean {
  if (session.pending) return false;
  // Stored ids are hashed at rest — match either domain (transition-safe).
  const creds = new Set([session.userId, hashId(session.userId)]);
  return ids.some(i => !isNewDevice(i) && creds.has(baseId(i)));
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
    ids.add(hashId(deviceId));
    ids.add(hashId(rotateLegacyId(deviceId)));
  }
  const session = await getSessionUser();
  if (session) {
    ids.add(session.userId);
    ids.add(hashId(session.userId));
  }
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
