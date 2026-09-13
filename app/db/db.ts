import { isConnectionPoolError } from '@/app/utils/dbErrors';
import type { UserType } from '@/app/contexts/authProvider';
import { V2_ID_PREFIX } from '@/app/utils/id';
import { createHmac } from 'crypto';
import postgres from 'postgres';

export { isConnectionPoolError };

/**
 * Secret used to derive rotated ids. Prefers a dedicated env var so the derivation
 * stays stable across credential rotations; falls back to the service role key.
 */
const rotationKey = () => process.env.ID_ROTATION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

/**
 * Deterministic rotation of a legacy (Math.random) id to a `v2_` HMAC-derived id.
 * Deterministic = idempotent: concurrent rotations converge to the same value, and a
 * stale cookie can be resolved by looking up the derived id. No-op for v2 ids or
 * when no rotation secret is configured.
 */
export function rotateLegacyId(id: string): string {
  if (id.startsWith(V2_ID_PREFIX)) return id;
  const key = rotationKey();
  if (!key) return id;
  return V2_ID_PREFIX + createHmac('sha256', key).update(id).digest('hex').slice(0, 32);
}

/**
 * SQL template literal for database queries
 * Works with any Postgres (Neon, Supabase, etc.) by just changing DATABASE_URL
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

export const sql = postgres(databaseUrl, {
  prepare: false, // Required for Supabase connection pooling
  max: 2, // Very conservative limit for Supabase free tier (15 max)
  idle_timeout: 10, // Close idle connections after 10 seconds
  connect_timeout: 5, // Fail fast if can't connect
});

/**
 * Check if a user exists and what type they are
 */
export async function getExistingUserType(userId: string): Promise<UserType | null> {
  try {
    const result = await sql`
      SELECT CASE
        WHEN EXISTS (SELECT 1 FROM conciergeries WHERE ${userId} = ANY(id)) THEN 'conciergerie'
        WHEN EXISTS (SELECT 1 FROM employees WHERE ${userId} = ANY(id) AND status = 'accepted') THEN 'employee'
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
