import { isConnectionPoolError } from '@/app/utils/dbErrors';
import type { UserType } from '@/app/contexts/authProvider';
import { V2_ID_PREFIX } from '@/app/utils/id';
import { createHash, createHmac } from 'crypto';
import { headers } from 'next/headers';
import postgres from 'postgres';

export { isConnectionPoolError };

/**
 * Secret used for HMAC derivations (id rotation, enrollment tokens).
 * Prefers a dedicated env var so derivations stay stable across credential
 * rotations; falls back to the service role key.
 */
export const hmacSecret = () => process.env.ID_ROTATION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

/**
 * Deterministic rotation of a legacy (Math.random) id to a `v2_` HMAC-derived id.
 * Deterministic = idempotent: concurrent rotations converge to the same value, and a
 * stale cookie can be resolved by looking up the derived id. No-op for v2 ids or
 * when no rotation secret is configured.
 */
export function rotateLegacyId(id: string): string {
  if (id.startsWith(V2_ID_PREFIX)) return id;
  const key = hmacSecret();
  if (!key) return id;
  return V2_ID_PREFIX + createHmac('sha256', key).update(id).digest('hex').slice(0, 32);
}

/**
 * sha256 of a raw device id — the form stored in the `id` arrays at rest
 * (a DB leak must not equal a credential leak). Cookies, localStorage and
 * email links keep carrying the RAW id; every DB comparison hashes first.
 * Reads dual-match (raw OR hash) so pre-migration rows keep resolving.
 */
export function hashId(id: string): string {
  return createHash('sha256').update(id).digest('hex');
}

/**
 * SQL template literal for database queries
 * Works with any Postgres (Neon, Supabase, etc.) by just changing DATABASE_URL
 */
const POOL_OPTIONS = {
  prepare: false, // Required for Supabase connection pooling
  max: 2, // Very conservative limit for Supabase free tier (15 max)
  idle_timeout: 10, // Close idle connections after 10 seconds
  connect_timeout: 5, // Fail fast if can't connect
} as const;

/**
 * True when the current request targets the demo database: the `x-demo`
 * marker (set by proxy.ts on demo.<domain> page requests) or a demo.* Host —
 * API routes skip middleware, so the host check is the reliable signal there.
 * Outside a request context (scripts, tests, build) → false → prod pool.
 */
export async function isDemoRequest(): Promise<boolean> {
  try {
    const h = await headers();
    if (h.get('x-demo') === '1') return true;
    return h.get('host')?.split(':')[0].startsWith('demo.') ?? false;
  } catch {
    return false;
  }
}

// One lazy pool per database — created on first use so importing this module
// never crashes when a URL is missing (tests, partially-configured envs).
let prodClient: postgres.Sql | null = null;
let demoClient: postgres.Sql | null = null;

async function pickClient(): Promise<postgres.Sql> {
  if (await isDemoRequest()) {
    const url = process.env.DEMO_DATABASE_URL;
    // Fail closed: a demo request without a demo database must never touch prod.
    if (!url) throw new Error('DEMO_DATABASE_URL is not set');
    return (demoClient ??= postgres(url, POOL_OPTIONS));
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return (prodClient ??= postgres(url, POOL_OPTIONS));
}

/**
 * SQL template literal for database queries.
 * The pool is picked per call: requests on demo.<domain> (x-demo marker or
 * demo.* Host header) hit DEMO_DATABASE_URL, everything else DATABASE_URL.
 *
 * postgres.js executes a query lazily at first .then() and detects template
 * fragments by `instanceof Query` — so each call mints a REAL dormant Query
 * via `shellClient` (a client that never connects) and redirects its
 * then/catch/finally to an identical query on the right pool. Nested
 * fragments (sql`…${sql`frag`}…`) still inline correctly while awaited
 * queries land on the right database.
 */
const shellClient = postgres('postgres://placeholder.invalid/placeholder', POOL_OPTIONS);

const lazySql = (strings: TemplateStringsArray, ...args: unknown[]) => {
  // Non-template calls (sql(value) → Identifier/Builder helpers) never run a
  // query — mint them on the dormant client directly.
  if (!(strings && Array.isArray(strings.raw))) {
    return shellClient(strings as unknown as string, ...(args as never[]));
  }

  const query = shellClient(strings, ...(args as never[])) as unknown as Record<string, unknown>;
  let delegate: Promise<unknown> | null = null;
  const run = () => (delegate ??= pickClient().then(c => c(strings, ...(args as never[]))));
  query.then = (res: never, rej: never) => run().then(res, rej);
  query.catch = (rej: never) => run().catch(rej);
  query.finally = (fn: never) => run().finally(fn);
  return query;
};

export const sql = new Proxy(lazySql, {
  apply: (_t, _thisArg, args) => lazySql(args[0] as TemplateStringsArray, ...args.slice(1)),
  get: (_t, prop) => {
    // Executing helpers route to the right pool at call time.
    if (prop === 'unsafe')
      return (query: string, params?: unknown[], opts?: object) =>
        pickClient().then(c => c.unsafe(query, params as never[], opts));
    if (prop === 'end')
      return () => Promise.all([prodClient?.end(), demoClient?.end()].filter(Boolean)).then(() => undefined);
    if (prop === 'begin' || prop === 'reserve' || prop === 'file')
      return (...args: unknown[]) => pickClient().then(c => (c[prop] as (...a: unknown[]) => unknown)(...args));
    // Pure helpers (array, json, types, typed, notify…) never touch the wire —
    // the dormant client mints them fine.
    return shellClient[prop as keyof postgres.Sql];
  },
}) as unknown as postgres.Sql;

/**
 * Check if a user exists and what type they are
 */
export async function getExistingUserType(userId: string): Promise<UserType | null> {
  try {
    const hashed = hashId(userId);
    const result = await sql`
      SELECT CASE
        WHEN EXISTS (SELECT 1 FROM conciergeries WHERE ${userId} = ANY(id) OR ${hashed} = ANY(id)) THEN 'conciergerie'
        WHEN EXISTS (SELECT 1 FROM employees WHERE (${userId} = ANY(id) OR ${hashed} = ANY(id)) AND status = 'accepted') THEN 'employee'
        ELSE NULL
      END AS result
    `;

    return result[0].result ? (result[0].result as UserType) : null;
  } catch (error) {
    console.error('Error checking user status:', error);
    return null;
  }
}

/**
 * Same as getExistingUserType but tolerant to a stale legacy id: if the row's id was
 * already rotated server-side, the derived v2 id still resolves the user.
 */
export async function getExistingUserTypeResilient(userId: string): Promise<UserType | null> {
  const userType = await getExistingUserType(userId);
  if (userType || userId.startsWith(V2_ID_PREFIX)) return userType;
  const rotated = rotateLegacyId(userId);
  return rotated === userId ? null : await getExistingUserType(rotated);
}
