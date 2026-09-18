import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createInvoice, getBillableConciergeries, getPlanChanges } from '@/app/db/billingDb';
import { sendBillingSummaryEmail, sendInvoiceEmail } from '@/app/actions/email';
import { computeMonthlyBill, previousMonth, type PlanChange } from '@/app/utils/billing';
import { PLANS } from '@/app/data/plans';

/**
 * Monthly billing cron — call on the 1st of each month.
 *
 * For every non-admin conciergerie it computes the MOST EXPENSIVE plan used
 * during the previous month (plan_changes log + current plan as baseline) and
 * writes an invoice row. The UNIQUE(conciergerie, year, month) constraint
 * makes re-runs idempotent — already-billed periods are skipped, not doubled.
 *
 * Each billed conciergerie receives its invoice by email; the admin gets a
 * summary. Payment collection itself stays manual for now (no stored payment
 * method — Revolut checkout is one-shot).
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` — same as the other crons.
 * Should be scheduled monthly (cron-job.org, GitHub Actions, Vercel Cron…).
 */
async function handleBillSubscriptions(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { year, month } = previousMonth();
  const monthName = `${String(month).padStart(2, '0')}/${year}`;

  const [conciergeries, changes] = await Promise.all([getBillableConciergeries(), getPlanChanges()]);

  // Group the event log by conciergerie
  const changesByName = new Map<string, PlanChange[]>();
  for (const c of changes) {
    const list = changesByName.get(c.conciergerie_name) ?? [];
    list.push({ to_plan: c.to_plan, created_at: c.created_at });
    changesByName.set(c.conciergerie_name, list);
  }

  let billed = 0;
  let skipped = 0;
  const lines: string[] = [];

  for (const c of conciergeries) {
    const bill = computeMonthlyBill(changesByName.get(c.name) ?? [], year, month, c.plan ?? 'pro');
    const created = await createInvoice(c.name, year, month, bill.plan, bill.amount, c.client_id ?? undefined);
    if (!created) {
      skipped++; // already billed this period (idempotent re-run)
      continue;
    }
    billed++;
    lines.push(`${c.name} : ${PLANS[bill.plan].name} — ${bill.amount} €`);

    // Internal cron call (isRetry=true) — no user session exists here.
    await sendInvoiceEmail(c.name, monthName, PLANS[bill.plan].name, bill.amount, true);
  }

  if (billed > 0) {
    await sendBillingSummaryEmail(monthName, lines, skipped, true);
  }

  return NextResponse.json({ period: `${year}-${String(month).padStart(2, '0')}`, billed, skipped });
}

export async function GET(request: NextRequest) {
  return handleBillSubscriptions(request);
}

export async function POST(request: NextRequest) {
  return handleBillSubscriptions(request);
}
