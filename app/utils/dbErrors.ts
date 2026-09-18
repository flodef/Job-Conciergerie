/**
 * Database error utility functions
 * These are kept separate from db.ts to avoid importing postgres in client components
 */

/**
 * Sentinel returned by rate-limited server actions — kept here so client
 * components can compare without importing the server-only rateLimit module
 * (which pulls postgres + next/headers).
 */
export const RATE_LIMITED = 'rate_limited' as const;
export type RateLimited = typeof RATE_LIMITED;

/**
 * Sentinel returned when a signup is rejected because the first+family name
 * pair is already taken — employee names are the join key used by missions,
 * so two people may never share one.
 */
export const NAME_TAKEN = 'name_taken' as const;
export type NameTaken = typeof NAME_TAKEN;

/**
 * Check if an error is a connection pool exhaustion error
 * Can be safely used in both server and client components
 */
export function isConnectionPoolError(error: unknown): boolean {
  if (!error) return false;
  const errorMsg = String(error).toLowerCase();
  return (
    errorMsg.includes('max clients') ||
    errorMsg.includes('emaxconnsession') ||
    errorMsg.includes('pool_size') ||
    errorMsg.includes('too many clients')
  );
}
