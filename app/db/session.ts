import { hashId, hmacSecret, rotateLegacyId, sql } from '@/app/db/db';
import { DEVICE_TTL_MS, getDeviceSeen, seenKey, syncDeviceSeen } from '@/app/db/deviceSeen';
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

interface Membership {
  userType: UserType;
  pending: boolean;
  /** True when the match came through an expired (stale-seen) entry. */
  expired: boolean;
  rowKey: string;
  /** The row's full id array, as read (needed by the stale-device sweep). */
  ids: string[];
  /** last_seen per device key — shared with the sweep so it doesn't refetch. */
  seen: Map<string, number>;
  /** Row locator for the sweep's compare-and-swap UPDATE. */
  match: { table: 'employees' | 'conciergeries'; k1: string; k2?: string | null };
}

/**
 * Resolve which row a credential id belongs to (conciergeries first), whether
 * the match is only through a pending (`$`-prefixed) entry, and the row data
 * needed downstream. A pending device resolves (so the waiting page works)
 * but carries `pending: true` — no privileges.
 *
 * Sliding-window expiration: an entry whose `device_seen` clock is older than
 * DEVICE_TTL does not resolve — the credential is dead even if still listed.
 * Entries with no clock yet are fresh (first contact seeds it).
 */
async function resolveMembership(id: string): Promise<Membership | null> {
  try {
    // Ids are hashed at rest — dual-match (raw OR sha256) keeps pre-migration
    // rows resolving during the transition.
    const hid = hashId(id);
    const forms = [id, hid, `$${id}`, `$${hid}`];
    const rows = await sql`
      SELECT 'conciergerie' AS user_type, name AS k1, NULL::text AS k2, id AS ids
        FROM conciergeries WHERE id && ${forms}::text[]
      UNION ALL
      SELECT 'employee', first_name, family_name, id
        FROM employees WHERE id && ${forms}::text[]`;
    if (!rows.length) return null;

    const seen = await getDeviceSeen([...new Set(rows.flatMap(r => (r.ids as string[]).map(seenKey)))]);
    const now = Date.now();
    const sorted = [...rows].sort((a, b) =>
      a.user_type === b.user_type ? 0 : a.user_type === 'conciergerie' ? -1 : 1,
    );
    for (const row of sorted) {
      const ids = row.ids as string[];
      const entry = ids.find(i => forms.includes(i));
      if (!entry) continue;
      const lastSeen = seen.get(seenKey(entry));
      const expired = lastSeen !== undefined && now - lastSeen > DEVICE_TTL_MS;
      const userType = row.user_type as UserType;
      return {
        userType,
        // An expired credential resolves as pending-only (limp-home): no
        // privileges, but the device can still reach its row to re-enroll
        // through the normal token/approval flow.
        pending: isNewDevice(entry) || expired,
        expired,
        rowKey: userType === 'conciergerie' ? (row.k1 as string) : `${row.k1} ${row.k2}`,
        ids,
        seen,
        match:
          userType === 'conciergerie'
            ? { table: 'conciergeries', k1: row.k1 as string }
            : { table: 'employees', k1: row.k1 as string, k2: row.k2 as string },
      };
    }
    return null;
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

  let sessionId = canonicalId;
  let rotated = false;

  // Lazy rotation: rewrite the legacy id in place (idempotent — v2 is deterministic)
  if (!canonicalId.startsWith(V2_ID_PREFIX)) {
    const newId = rotateLegacyId(canonicalId);
    if (newId !== canonicalId) {
      try {
        // Rewrite both forms (raw during transition, hash after migration),
        // preserving the pending marker — result is always hashId(rotated).
        const hCanonical = hashId(canonicalId);
        const hRotated = hashId(newId);
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
        sessionId = newId;
        rotated = true;
      } catch (error) {
        console.error('Error rotating legacy user id:', error);
      }

      if (rotated)
        try {
          (await cookies()).set(USER_ID_COOKIE, newId, {
            path: '/',
            maxAge: COOKIE_MAX_AGE,
            sameSite: 'lax',
          });
        } catch {
          // Read-only context — the client syncs through the syncSession response
        }
    }
  }

  // Sliding-window bookkeeping (best-effort): refresh this device's clock,
  // seed unseen entries, prune stale ones. Skipped for expired credentials —
  // touching its clock would resurrect it, and its stale entry is the limp-home
  // lifeline back to the row (other devices' logins sweep it). The prune UPDATE
  // is CAS-guarded on the pre-rotation snapshot: after a rewrite it just skips.
  if (!membership.expired)
    await syncDeviceSeen({
      rawSessionId: sessionId,
      ids: membership.ids,
      seen: membership.seen,
      match: membership.match,
    });

  return { userId: sessionId, userType, rotated, pending, rowKey };
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
