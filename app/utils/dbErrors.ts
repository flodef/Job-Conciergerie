/**
 * Database error utility functions
 * These are kept separate from db.ts to avoid importing postgres in client components
 */

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
