import { sql } from '@/app/db/db';
import type { ConciergeriePlan } from '@/app/types/dataTypes';

// Subscription billing tables (migrations/create_subscription_billing.sql):
// - plan_changes: append-only event log of plan switches
// - invoices: one row per conciergerie per billed month (idempotent via the
//   UNIQUE constraint on conciergerie_name+period)

export const logPlanChange = async (
  conciergerieName: string,
  fromPlan: ConciergeriePlan | null,
  toPlan: ConciergeriePlan,
  changedBy: string,
  clientId?: string,
): Promise<void> => {
  try {
    await sql`
      INSERT INTO plan_changes (conciergerie_name, from_plan, to_plan, changed_by, client_id)
      VALUES (${conciergerieName}, ${fromPlan}, ${toPlan}, ${changedBy}, ${clientId ?? null}::uuid)
    `;
  } catch (error) {
    // Never let the audit log block the plan change itself — the row is
    // already written; the bill would just under-count this switch.
    console.error(`Error logging plan change for ${conciergerieName}:`, error);
  }
};

export interface DbPlanChange {
  conciergerie_name: string;
  from_plan: ConciergeriePlan | null;
  to_plan: ConciergeriePlan;
  created_at: string;
}

export const getPlanChanges = async (): Promise<DbPlanChange[]> => {
  try {
    const result = await sql`
      SELECT conciergerie_name, from_plan, to_plan, created_at
      FROM plan_changes
      ORDER BY conciergerie_name, created_at
    `;
    return result.map(row => row as DbPlanChange);
  } catch (error) {
    console.error('Error fetching plan changes:', error);
    return [];
  }
};

export interface DbInvoice {
  id: string;
  conciergerie_name: string;
  period_year: number;
  period_month: number;
  plan: ConciergeriePlan;
  amount: number;
  status: 'pending' | 'sent' | 'paid' | 'cancelled';
  created_at: string;
}

/**
 * Insert an invoice row — ON CONFLICT DO NOTHING makes the billing cron
 * idempotent: re-running it for the same period never double-bills.
 */
export const createInvoice = async (
  conciergerieName: string,
  periodYear: number,
  periodMonth: number,
  plan: ConciergeriePlan,
  amount: number,
  clientId?: string,
): Promise<boolean> => {
  try {
    const result = await sql`
      INSERT INTO invoices (conciergerie_name, period_year, period_month, plan, amount, client_id)
      VALUES (${conciergerieName}, ${periodYear}, ${periodMonth}, ${plan}, ${amount}, ${clientId ?? null}::uuid)
      ON CONFLICT (conciergerie_name, period_year, period_month) DO NOTHING
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    console.error(`Error creating invoice for ${conciergerieName}:`, error);
    return false;
  }
};

/**
 * Billable conciergeries (admin-client rows excluded) with their current
 * plan and client — the cron iterates these to write monthly invoices.
 */
export const getBillableConciergeries = async (): Promise<
  { name: string; email: string; plan: ConciergeriePlan; client_id: string | null }[]
> => {
  try {
    const result = await sql`
      SELECT c.name, c.email, c.plan, c.client_id
      FROM conciergeries c
      LEFT JOIN clients cl ON cl.id = c.client_id
      WHERE COALESCE(cl.is_admin, false) = false
    `;
    return result.map(row => row as { name: string; email: string; plan: ConciergeriePlan; client_id: string | null });
  } catch (error) {
    console.error('Error fetching billable conciergeries:', error);
    return [];
  }
};

export const getInvoices = async (): Promise<DbInvoice[]> => {
  try {
    const result = await sql`
      SELECT id, conciergerie_name, period_year, period_month, plan, amount, status, created_at
      FROM invoices
      ORDER BY period_year DESC, period_month DESC, conciergerie_name
    `;
    return result.map(row => row as DbInvoice);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
};
