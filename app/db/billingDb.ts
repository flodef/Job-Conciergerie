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
  discount = 0,
): Promise<boolean> => {
  try {
    const result = await sql`
      INSERT INTO invoices (conciergerie_name, period_year, period_month, plan, amount, client_id, discount)
      VALUES (${conciergerieName}, ${periodYear}, ${periodMonth}, ${plan}, ${amount}, ${clientId ?? null}::uuid, ${discount})
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
 * Record the external invoicing tool (IMS) reference on a local invoice —
 * lets the accounting side and this app cross-reference each other.
 */
export const setInvoiceExternalRef = async (
  conciergerieName: string,
  periodYear: number,
  periodMonth: number,
  externalRef: string,
): Promise<void> => {
  try {
    await sql`
      UPDATE invoices SET external_ref = ${externalRef}
      WHERE conciergerie_name = ${conciergerieName}
        AND period_year = ${periodYear}
        AND period_month = ${periodMonth}
    `;
  } catch (error) {
    console.error(`Error setting invoice external ref for ${conciergerieName}:`, error);
  }
};

/**
 * Billable conciergeries (admin-client rows excluded) with their current
 * plan and client — the cron iterates these to write monthly invoices.
 */
export interface BillableConciergerie {
  name: string;
  email: string;
  plan: ConciergeriePlan;
  client_id: string | null;
  discount: number;
  billing_period: 'monthly' | 'annual';
  plan_until: string | null;
}

export const getBillableConciergeries = async (): Promise<BillableConciergerie[]> => {
  try {
    const result = await sql`
      SELECT c.name, c.email, c.plan, c.client_id,
             COALESCE(c.discount, 0) AS discount,
             COALESCE(c.billing_period, 'monthly') AS billing_period,
             c.plan_until
      FROM conciergeries c
      LEFT JOIN clients cl ON cl.id = c.client_id
      WHERE COALESCE(cl.is_admin, false) = false
    `;
    return result.map(row => row as BillableConciergerie);
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
