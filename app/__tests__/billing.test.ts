import { describe, expect, it } from 'vitest';
import { applyDiscount, computeMonthlyBill, previousMonth, type PlanChange } from '@/app/utils/billing';

const ev = (to_plan: PlanChange['to_plan'], date: string): PlanChange => ({
  to_plan,
  created_at: new Date(date),
});

describe('computeMonthlyBill', () => {
  it('bills the current plan when there are no events', () => {
    const bill = computeMonthlyBill([], 2026, 3, 'pro');
    expect(bill).toEqual({ year: 2026, month: 3, plan: 'pro', amount: 50 });
  });

  it('bills the most expensive plan switched to during the month', () => {
    // Started Découverte → Privilège mid-month → billed Privilège.
    const bill = computeMonthlyBill([ev('privilege', '2026-03-10T12:00:00Z')], 2026, 3, 'decouverte');
    expect(bill.plan).toBe('privilege');
    expect(bill.amount).toBe(100);
  });

  it('downgrading mid-month still bills the higher plan used', () => {
    const bill = computeMonthlyBill(
      [
        ev('decouverte', '2026-03-05T12:00:00Z'),
        ev('pro', '2026-03-20T12:00:00Z'),
        ev('decouverte', '2026-03-25T12:00:00Z'),
      ],
      2026,
      3,
      'decouverte',
    );
    expect(bill.plan).toBe('pro');
    expect(bill.amount).toBe(50);
  });

  it('uses the last pre-month event as the plan at month start', () => {
    // Upgraded to Privilège in February, no March event → Privilège all month.
    const bill = computeMonthlyBill([ev('privilege', '2026-02-15T12:00:00Z')], 2026, 3, 'privilege');
    expect(bill.plan).toBe('privilege');
    expect(bill.amount).toBe(100);
  });

  it('first-month downgrade bills the higher plan it came from', () => {
    // Was Privilège, downgraded to Découverte on March 5 — the first logged
    // event. The from_plan reconstructs the plan held at month start.
    const bill = computeMonthlyBill(
      [{ from_plan: 'privilege', to_plan: 'decouverte', created_at: new Date('2026-03-05T12:00:00Z') }],
      2026,
      3,
      'decouverte',
    );
    expect(bill.plan).toBe('privilege');
    expect(bill.amount).toBe(100);
  });

  it('a post-month event does not leak its new plan into the billed month', () => {
    // Découverte all March, upgraded April 10 — March bills Découverte even
    // though the current plan is now Privilège.
    const bill = computeMonthlyBill(
      [{ from_plan: 'decouverte', to_plan: 'privilege', created_at: new Date('2026-04-10T12:00:00Z') }],
      2026,
      3,
      'privilege',
    );
    expect(bill.plan).toBe('decouverte');
    expect(bill.amount).toBe(30);
  });

  it('pre-month downgrade carries into the month', () => {
    const bill = computeMonthlyBill([ev('decouverte', '2026-02-20T12:00:00Z')], 2026, 3, 'decouverte');
    expect(bill.plan).toBe('decouverte');
    expect(bill.amount).toBe(30);
  });

  it('ignores events after the billed month', () => {
    const bill = computeMonthlyBill(
      [ev('privilege', '2026-04-01T00:00:01Z')], // April — must not count for March
      2026,
      3,
      'decouverte',
    );
    expect(bill.plan).toBe('decouverte');
  });

  it('counts a switch on the last second of the month', () => {
    const bill = computeMonthlyBill([ev('privilege', '2026-03-31T23:59:59Z')], 2026, 3, 'decouverte');
    expect(bill.plan).toBe('privilege');
  });

  it('skips malformed dates without corrupting the month', () => {
    const bill = computeMonthlyBill(
      [{ to_plan: 'privilege', created_at: 'not-a-date' }, ev('pro', '2026-03-02T00:00:00Z')],
      2026,
      3,
      'decouverte',
    );
    expect(bill.plan).toBe('pro');
  });
});

describe('applyDiscount', () => {
  it('applies a negotiated percentage (Pro 50 €, −40 % → 30 €)', () => {
    expect(applyDiscount(50, 40)).toBe(30);
  });

  it('returns the amount unchanged without discount', () => {
    expect(applyDiscount(50, 0)).toBe(50);
  });

  it('clamps out-of-range percentages', () => {
    expect(applyDiscount(50, -10)).toBe(50);
    expect(applyDiscount(50, 120)).toBe(0);
  });

  it('rounds to cents', () => {
    expect(applyDiscount(30, 15)).toBe(25.5);
  });
});

describe('previousMonth', () => {
  it('returns the previous month', () => {
    expect(previousMonth(new Date('2026-03-01T00:00:00Z'))).toEqual({ year: 2026, month: 2 });
  });

  it('rolls over the year in January', () => {
    expect(previousMonth(new Date('2026-01-01T12:00:00Z'))).toEqual({ year: 2025, month: 12 });
  });
});
