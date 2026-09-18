import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  createInvoice,
  getBillableConciergeries,
  getInvoice,
  getPlanChanges,
  setInvoiceExternalRef,
} from '@/app/db/billingDb';
import { sendBillingSummaryEmail, sendInvoiceEmail } from '@/app/utils/billingEmails';
import { applyDiscount, computeMonthlyBill, previousMonth, type PlanChange } from '@/app/utils/billing';
import { importInvoiceToIms } from '@/app/utils/imsClient';
import { PLANS } from '@/app/data/plans';

/**
 * Monthly billing cron — call on the 1st of each month.
 *
 * For every non-admin conciergerie it computes the MOST EXPENSIVE plan used
 * during the previous month (plan_changes log + current plan as baseline) and
 * writes an invoice row. The UNIQUE(conciergerie, year, month) constraint
 * makes re-runs idempotent — already-billed periods are skipped, not doubled.
 *
 * Client invoice emails are gated behind BILLING_CLIENT_EMAILS=true — while
 * unset, invoices are created (and pushed to IMS) but nothing is emailed to
 * customers; collection stays fully manual via IMS. The admin summary is
 * always sent.
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
    list.push({ from_plan: c.from_plan, to_plan: c.to_plan, created_at: c.created_at });
    changesByName.set(c.conciergerie_name, list);
  }

  let billed = 0;
  let skipped = 0;
  let annual = 0;
  const lines: string[] = [];
  const now = new Date();

  for (const c of conciergeries) {
    // Annual subscriptions are paid once via the landing checkout — they run
    // their full year outside the monthly model (no invoice, no plan change
    // until plan_until). They re-enter monthly billing after expiry.
    if (c.billing_period === 'annual' && c.plan_until && new Date(c.plan_until) > now) {
      annual++;
      continue;
    }

    const bill = computeMonthlyBill(changesByName.get(c.name) ?? [], year, month, c.plan ?? 'pro');
    const amount = applyDiscount(bill.amount, c.discount);
    const created = await createInvoice(c.name, year, month, bill.plan, amount, c.client_id ?? undefined, c.discount);
    let pushPlan = bill.plan;
    let pushDiscount = c.discount;
    if (created) {
      billed++;
      lines.push(`${c.name} : ${PLANS[bill.plan].name} — ${amount} €${c.discount ? ` (−${c.discount}%)` : ''}`);

      // Client emails stay OFF until explicitly enabled — collection is manual
      // via IMS for now. On SMTP failure the payload queues in failed_emails.
      if (process.env.BILLING_CLIENT_EMAILS === 'true') {
        await sendInvoiceEmail(c.name, monthName, PLANS[bill.plan].name, amount, bill.amount);
      }
    } else {
      skipped++; // already billed this period (idempotent re-run)
      const existing = await getInvoice(c.name, year, month);
      if (!existing || existing.external_ref) continue; // billed AND synced — nothing to heal
      pushPlan = existing.plan;
      pushDiscount = existing.discount;
    }

    // Sync to the accounting tool (IMS). A failure never blocks the billing
    // run — the local invoice is the source of truth — and a later run heals
    // it: an existing invoice without external_ref is pushed again with its
    // stored snapshot (IMS dedupes on service label + period → no double
    // import; undefined row/error → skipped this run, retried next).
    const ref = await importInvoiceToIms({
      clientName: c.name,
      clientEmail: c.email,
      serviceLabel: `Abonnement Job Conciergerie — ${PLANS[pushPlan].name}`,
      periodLabel: monthName,
      unitPrice: PLANS[pushPlan].monthly,
      discount: pushDiscount,
      invoiceDate: now.toISOString().slice(0, 10),
    });
    if (ref) await setInvoiceExternalRef(c.name, year, month, ref);
  }

  if (billed > 0) {
    await sendBillingSummaryEmail(monthName, lines, skipped);
  }

  return NextResponse.json({
    period: `${year}-${String(month).padStart(2, '0')}`,
    billed,
    skipped,
    annual,
  });
}

export async function GET(request: NextRequest) {
  return handleBillSubscriptions(request);
}

export async function POST(request: NextRequest) {
  return handleBillSubscriptions(request);
}
