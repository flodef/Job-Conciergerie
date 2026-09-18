import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { sql } from '@/app/db/db';

/**
 * Postgres-backed fixed-window rate limiting for sensitive server actions.
 *
 * Unlike the in-memory anti-spam blocklist (per-process only), the counters
 * live in the DB and are shared across serverless instances. Keys are hashed
 * (`action|ip` or `action|scope`) so no IP address is stored in clear.
 *
 * The table is created lazily on first use — see migrations/create_rate_limits.sql.
 */

// The RATE_LIMITED sentinel lives in utils/dbErrors.ts (client-safe module) —
// re-exported here for server-side convenience.
export { RATE_LIMITED } from '@/app/utils/dbErrors';
export type { RateLimited } from '@/app/utils/dbErrors';

// The cached promise must reset on failure — otherwise one transient error
// poisons the table setup until the instance restarts.
let tableReady: Promise<unknown> | null = null;
const ensureTable = () => {
  tableReady ??= sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key text PRIMARY KEY,
      count integer NOT NULL,
      window_start timestamptz NOT NULL DEFAULT now()
    )
  `.catch(e => {
    tableReady = null;
    throw e;
  });
  return tableReady;
};

/**
 * Client IP — only proxy-provided headers are trusted. On Vercel the platform
 * appends the real client IP as the LAST x-forwarded-for entry; earlier entries
 * are client-controlled and must not be trusted.
 */
async function getClientIp(): Promise<string> {
  const h = await headers();
  const real = h.get('x-real-ip');
  if (real) return real.trim();
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const parts = xff
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'unknown';
}

const hash = (v: string) => createHash('sha256').update(v).digest('hex').slice(0, 32);

// Loopback/private addresses — local dev and LAN traffic stay unlimited so
// manual/E2E testing can't trip the limiter (Vercel always provides xff).
const isPrivateIp = (ip: string) =>
  ip === 'unknown' ||
  ip === '::1' ||
  /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^::ffff:127\.|^fe80:|^fc00:|^fd/.test(ip);

/**
 * Register one attempt for `action` and tell whether it is allowed.
 * Scoped per client IP by default; pass `scope` to limit on another key
 * (e.g. the device id for enrollment). IP-scoped checks are skipped for
 * loopback/private clients — explicit scopes always count.
 *
 * Fails OPEN on infrastructure errors: a broken rate_limits table must not
 * take the whole app down (the action itself is still guarded elsewhere).
 */
export async function checkRateLimit(
  action: string,
  limit: number,
  windowSec: number,
  scope?: string,
): Promise<boolean> {
  try {
    if (!scope && isPrivateIp(await getClientIp())) return true;
    const key = hash(`${action}|${scope ?? (await getClientIp())}`);
    await ensureTable();
    const rows = await sql`
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (${key}, 1, now())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec})
                     THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec})
                            THEN now() ELSE rate_limits.window_start END
      RETURNING count
    `;
    const allowed = (rows[0]?.count as number) <= limit;
    if (!allowed) console.warn(`Rate limit hit: ${action} (${limit}/${windowSec}s)`);
    return allowed;
  } catch (error) {
    console.error('Rate limit check failed (failing open):', error);
    return true;
  }
}
