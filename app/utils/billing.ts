import { PLANS, PLAN_ORDER } from '@/app/data/plans';
import type { ConciergeriePlan } from '@/app/types/dataTypes';

// Monthly billing: a conciergerie is billed the MOST EXPENSIVE plan it used
// at any point during the month, invoiced on the 1st of the next month.
// Downgrading mid-month does not reduce that month's bill.

export interface PlanChange {
  to_plan: ConciergeriePlan;
  created_at: string | Date;
}

export interface MonthlyBill {
  year: number;
  month: number; // 1-12
  plan: ConciergeriePlan;
  amount: number; // PLANS[plan].monthly
}

const planRank = (plan: ConciergeriePlan): number => PLAN_ORDER.indexOf(plan);

const isPlan = (value: unknown): value is ConciergeriePlan => typeof value === 'string' && value in PLANS;

/**
 * Highest plan used during `year`/`month`, given the change log.
 *
 * The plan at month start is the `to_plan` of the last event before the
 * month; with no event at all the conciergerie is assumed to have been on
 * `currentPlan` for the whole period. Every switch during the month counts —
 * the most expensive of {plan at start, every plan switched to} wins.
 */
export function computeMonthlyBill(
  events: PlanChange[],
  year: number,
  month: number,
  currentPlan: ConciergeriePlan,
): MonthlyBill {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const sorted = [...events]
    .map(e => ({ plan: e.to_plan, at: e.created_at instanceof Date ? e.created_at : new Date(e.created_at) }))
    .filter(e => isPlan(e.plan) && !isNaN(e.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  // Plan held at the start of the month.
  let best: ConciergeriePlan = currentPlan;
  for (const e of sorted) {
    if (e.at < monthStart) best = e.plan;
    else break;
  }

  // Every plan switched to during the month counts.
  for (const e of sorted) {
    if (e.at < monthStart) continue;
    if (e.at >= monthEnd) break;
    if (planRank(e.plan) > planRank(best)) best = e.plan;
  }

  return { year, month, plan: best, amount: PLANS[best].monthly };
}

/** Year/month (1-12) of the month before `date` — the period a 1st-of-month cron bills. */
export function previousMonth(date: Date = new Date()): { year: number; month: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}
