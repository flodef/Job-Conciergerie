-- Subscription billing (C.4): monthly plan billing by highest plan used.
--
-- Billing model (per the product spec): every month a conciergerie is billed
-- the MOST EXPENSIVE plan it used at any point during that month, invoiced on
-- the 1st of the following month. Downgrading mid-month does not reduce the
-- bill — the month is already being consumed at the higher tier.
--
-- plan_changes = append-only event log of every plan switch (who, when,
-- from → to). The plan at month start is reconstructed from the last event
-- before the month; a conciergerie with no events is assumed to have been on
-- its current plan for the whole period.
--
-- invoices = one row per conciergerie per period, computed by the
-- /api/bill-subscriptions cron. UNIQUE(conciergerie_name, year, month) makes
-- the cron idempotent — re-running it never double-bills.

CREATE TABLE IF NOT EXISTS plan_changes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conciergerie_name text NOT NULL,
    from_plan text CHECK (from_plan IS NULL OR from_plan IN ('decouverte', 'pro', 'privilege')),
    to_plan text NOT NULL CHECK (to_plan IN ('decouverte', 'pro', 'privilege')),
    -- session rowKey of who changed it; 'admin' when done via impersonation,
    -- 'system' for writes outside the settings UI (SQL, seed, migration).
    changed_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    client_id uuid
);

CREATE TABLE IF NOT EXISTS invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conciergerie_name text NOT NULL,
    period_year int NOT NULL,
    period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    plan text NOT NULL CHECK (plan IN ('decouverte', 'pro', 'privilege')),
    amount numeric(10, 2) NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    client_id uuid,
    UNIQUE (conciergerie_name, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS plan_changes_lookup
    ON plan_changes (conciergerie_name, created_at);
