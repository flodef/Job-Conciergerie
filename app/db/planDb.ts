import { sql } from '@/app/db/db';
import type { SessionUser } from '@/app/db/session';
import type { UserType } from '@/app/contexts/authProvider';
import type { ConciergeriePlan } from '@/app/types/dataTypes';
import { planLimits } from '@/app/data/plans';

/**
 * The subscription plan of a conciergerie row. Missing/NULL plans fall back to
 * 'pro' — same default as `formatConciergerie` (grandfathered rows keep their
 * feature access until an explicit downgrade).
 */
export async function getConciergeriePlan(name: string): Promise<ConciergeriePlan> {
  try {
    const result = await sql`
      SELECT plan FROM conciergeries WHERE name = ${name} LIMIT 1
    `;
    const plan = result[0]?.plan;
    return plan === 'decouverte' || plan === 'pro' || plan === 'privilege' ? plan : 'pro';
  } catch (error) {
    console.error(`Error fetching plan for conciergerie ${name}:`, error);
    return 'pro';
  }
}

/**
 * The plan governing a user's features: a conciergerie's own plan, or the plan
 * of the conciergerie an employee belongs to (rowKey = "firstName familyName").
 */
/**
 * The conciergerie an employee registered under (rowKey = "firstName familyName").
 * NULL/empty stays NULL — legacy rows predate the column and are treated as
 * unclaimed (legacy open-pool visibility) until the backfill/claim assigns them.
 */
export async function getEmployeeConciergerieName(rowKey: string, clientId?: string): Promise<string | null> {
  try {
    const result = await sql`
      SELECT conciergerie_name FROM employees
      WHERE first_name || ' ' || family_name = ${rowKey}
      AND (${clientId ?? null}::uuid IS NULL OR client_id = ${clientId ?? null}::uuid)
      LIMIT 1
    `;
    return (result[0]?.conciergerie_name as string | null) || null;
  } catch (error) {
    console.error('Error resolving employee conciergerie:', error);
    return null;
  }
}

export async function getUserPlan(userType: UserType, rowKey: string, clientId?: string): Promise<ConciergeriePlan> {
  if (userType === 'conciergerie') return getConciergeriePlan(rowKey);
  const name = await getEmployeeConciergerieName(rowKey, clientId);
  return name ? getConciergeriePlan(name) : 'pro';
}

/**
 * Names of the conciergeries whose plan enables multi-conciergerie (their open
 * missions are visible to the whole provider pool, not just their own staff).
 */
export async function getMultiConciergerieNames(clientId?: string): Promise<string[]> {
  try {
    const result = await sql`
      SELECT name, plan FROM conciergeries
      WHERE (${clientId ?? null}::uuid IS NULL OR client_id = ${clientId ?? null}::uuid)
    `;
    return result
      .filter(r => planLimits(r.plan as ConciergeriePlan | null | undefined).multiConciergerie)
      .map(r => r.name as string);
  } catch (error) {
    console.error('Error fetching multi-conciergerie names:', error);
    return [];
  }
}

/**
 * The plan governing the session's features. Impersonating sessions resolve
 * the target's plan (rowKey is the target's).
 */
export async function getSessionPlan(session: SessionUser): Promise<ConciergeriePlan> {
  // Employee lookups are name-based — the tenant scope keeps a homonymous
  // employee row in another tenant from resolving the wrong home conciergerie.
  return getUserPlan(session.userType, session.rowKey, session.clientId ?? undefined);
}
