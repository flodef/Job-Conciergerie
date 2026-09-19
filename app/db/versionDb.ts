import { sql } from '@/app/db/db';
import { getEmployeeConciergerieName } from '@/app/db/planDb';
import type { SessionUser } from '@/app/db/session';
import type { UserType } from '@/app/contexts/authProvider';
import type { ProductVersion } from '@/app/types/dataTypes';

/**
 * The product generation of a conciergerie row ('v2' | 'v3').
 * Fail-closed: a missing or unknown value resolves to 'v2' — a feature must
 * never unlock by accident.
 */
export async function getConciergerieVersion(name: string): Promise<ProductVersion> {
  try {
    const result = await sql`
      SELECT version FROM conciergeries WHERE name = ${name} LIMIT 1
    `;
    return result[0]?.version === 'v3' ? 'v3' : 'v2';
  } catch (error) {
    console.error(`Error fetching version for conciergerie ${name}:`, error);
    return 'v2';
  }
}

/**
 * The version governing a user's features: a conciergerie's own version, or
 * the version of the conciergerie an employee belongs to (rowKey =
 * "firstName familyName"). Unclaimed employees stay on 'v2'.
 */
export async function getUserVersion(userType: UserType, rowKey: string, clientId?: string): Promise<ProductVersion> {
  if (userType === 'conciergerie') return getConciergerieVersion(rowKey);
  const name = await getEmployeeConciergerieName(rowKey, clientId);
  return name ? getConciergerieVersion(name) : 'v2';
}

/**
 * The version governing the session's features. Impersonating sessions
 * resolve the target's version (rowKey is the target's).
 */
export async function getSessionVersion(session: SessionUser): Promise<ProductVersion> {
  return getUserVersion(session.userType, session.rowKey, session.clientId ?? undefined);
}
