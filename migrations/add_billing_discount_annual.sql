-- Billing evolution: per-conciergerie discounts + annual subscriptions.
--
-- conciergeries.discount       — negotiated reduction in % (0-100), applied
--                                to every generated invoice. 0 = list price.
-- conciergeries.billing_period — 'monthly' (default, billed by the cron) or
--                                'annual' (paid once via the landing checkout).
-- conciergeries.plan_until     — end of the active annual coverage. While
--                                billing_period='annual' AND plan_until > now,
--                                the monthly cron skips the conciergerie and
--                                plan changes are blocked (an annual plan runs
--                                its full year; a new plan is chosen at expiry).
--                                Annual provisioning is manual for now — set
--                                these columns when a Revolut annual order
--                                completes:
--                                  UPDATE conciergeries
--                                  SET billing_period='annual',
--                                      plan=<plan>,
--                                      plan_until=now()+interval '1 year'
--                                  WHERE name='<conciergerie>';
--
-- invoices.discount     — snapshot of the % applied at generation time, so
--                         historical invoices stay correct if the negotiated
--                         discount later changes.
-- invoices.external_ref — reference in the external invoicing tool (IMS),
--                         filled after the invoice is pushed there.

ALTER TABLE conciergeries
    ADD COLUMN IF NOT EXISTS discount int NOT NULL DEFAULT 0
        CHECK (discount BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS billing_period text NOT NULL DEFAULT 'monthly'
        CHECK (billing_period IN ('monthly', 'annual')),
    ADD COLUMN IF NOT EXISTS plan_until timestamptz;

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS discount int NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS external_ref text;
