import { hashId, sql } from '@/app/db/db';
import { baseId } from '@/app/utils/id';

/**
 * Sliding-window device expiration (A.4 #2).
 *
 * `device_seen` records, per device credential (hash domain — never the raw
 * id), when it was last used. A stored `id` entry that has not been seen within
 * DEVICE_TTL_DAYS stops resolving sessions and is pruned from the row lazily.
 * An entry with no row counts as fresh (pre-feature devices get a full window
 * starting from their first post-deploy activity — see seed-on-sight in
 * `syncDeviceSeen`), so deployment never causes a mass lockout.
 */

export const DEVICE_TTL_DAYS = parseInt(process.env.DEVICE_TTL_DAYS || '90');
export const DEVICE_TTL_MS = DEVICE_TTL_DAYS * 24 * 60 * 60 * 1000;
/** Touch granularity — avoids one write per server action. */
const TOUCH_MS = 60 * 60 * 1000;

const HEX64 = /^[0-9a-f]{64}$/;

/**
 * Key under which a stored id entry is tracked in `device_seen`. Hashed
 * entries key by themselves; a raw entry (pre-migration rows) keys by its
 * sha256 — the same value a session touch writes, since cookies carry raw ids.
 */
export const seenKey = (storedEntry: string): string => {
  const b = baseId(storedEntry);
  return HEX64.test(b) ? b : hashId(b);
};

let ensured: Promise<void> | null = null;
const ensureTable = () =>
  (ensured ??= sql`
    CREATE TABLE IF NOT EXISTS device_seen (
      device_hash text PRIMARY KEY,
      last_seen timestamptz NOT NULL DEFAULT now()
    )`.then(() => {}));

/**
 * Fetch last_seen for a set of device keys (already in seenKey domain).
 * Returns a map device_hash → last_seen millis. Missing keys = never seen
 * under this system = fresh.
 */
export async function getDeviceSeen(keys: string[]): Promise<Map<string, number>> {
  try {
    if (!keys.length) return new Map();
    await ensureTable();
    const rows = await sql`SELECT device_hash, last_seen FROM device_seen WHERE device_hash = ANY(${keys})`;
    return new Map(rows.map(r => [r.device_hash as string, new Date(r.last_seen as string).getTime()]));
  } catch (error) {
    console.error('Error reading device_seen:', error);
    return new Map();
  }
}

/** Single-entry convenience wrapper. */
export const getDeviceSeenAt = async (key: string): Promise<number | undefined> =>
  (await getDeviceSeen([key])).get(key);

/**
 * Reset/refresh the activity timestamp for device keys already in the seenKey
 * domain (e.g. entries of a stored id array — use `seenKey` to convert).
 */
export async function touchDeviceKeys(keys: string[]): Promise<void> {
  try {
    if (!keys.length) return;
    await ensureTable();
    await sql`
      INSERT INTO device_seen (device_hash, last_seen)
      SELECT unnest(${keys}::text[]), now()
      ON CONFLICT (device_hash) DO UPDATE SET last_seen = now()`;
  } catch (error) {
    console.error('Error touching device_seen:', error);
  }
}

/**
 * Reset/refresh the activity timestamp for raw device ids (e.g. after a
 * successful enrollment or approval — fresh proof must clear an expired clock,
 * otherwise the device would be rejected forever).
 */
export async function touchDevices(rawIds: string[]): Promise<void> {
  return touchDeviceKeys(rawIds.map(hashId));
}

/**
 * Record activity for the session device and expire what needs expiring:
 * 1. touch the caller's own key (throttled to TOUCH_MS),
 * 2. seed the clock for entries never observed (first post-deploy contact),
 * 3. drop stale entries from the row — compare-and-swap on the old array so a
 *    concurrent enroll/rotation write wins instead of being overwritten.
 *
 * `ids` is the row's id array as read at resolution time; `match` locates the
 * row for the prune UPDATE.
 */
export async function syncDeviceSeen(opts: {
  rawSessionId: string;
  ids: string[];
  seen: Map<string, number>;
  match: { table: 'employees' | 'conciergeries'; k1: string; k2?: string | null };
}): Promise<void> {
  try {
    const { rawSessionId, ids, seen, match } = opts;
    const now = Date.now();
    const ownKey = hashId(rawSessionId);
    const ownLast = seen.get(ownKey);
    if (!ownLast || now - ownLast > TOUCH_MS) await touchDevices([rawSessionId]);

    // Seed-on-sight: entries with no clock get one starting now
    const missing = [...new Set(ids.map(seenKey).filter(k => !seen.has(k)))].filter(k => k !== ownKey);
    if (missing.length) {
      await ensureTable();
      await sql`INSERT INTO device_seen (device_hash) SELECT unnest(${missing}::text[]) ON CONFLICT DO NOTHING`;
    }

    const stale = ids.filter(i => {
      const t = seen.get(seenKey(i));
      return t !== undefined && now - t > DEVICE_TTL_MS;
    });
    if (!stale.length) return;

    const next = ids.filter(i => !stale.includes(i));
    const updated =
      match.table === 'employees'
        ? await sql`UPDATE employees SET id = ${next}::text[]
            WHERE first_name = ${match.k1} AND family_name = ${match.k2 ?? ''} AND id = ${ids}::text[]`
        : await sql`UPDATE conciergeries SET id = ${next}::text[]
            WHERE name = ${match.k1} AND id = ${ids}::text[]`;
    if (updated.count > 0)
      console.log(`[device_seen] pruned ${stale.length} stale device(s) from ${match.table} ${match.k1}`);
  } catch (error) {
    console.error('Error syncing device_seen:', error);
  }
}
