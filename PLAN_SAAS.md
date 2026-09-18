# SaaS billing — model & operations

## Monthly billing (cron)

`GET|POST /api/bill-subscriptions` — auth `Authorization: Bearer <CRON_SECRET>`.
Run monthly, on the 1st. It bills the previous calendar month:

- One invoice per conciergerie per month (`invoices`, UNIQUE on
  name+year+month → re-runs are idempotent).
- The billed plan is the **most expensive plan used at any point during the
  month** (`plan_changes` log + current plan). Mid-month downgrades don't
  reduce the bill.
- `conciergeries.discount` (0-100 %) is applied to the plan list price and
  snapshotted on the invoice row (`invoices.discount`).
- Invoice rows are `pending` — payment collection is manual. The invoice
  email goes to the conciergerie, a summary to `ADMIN_ALERT_EMAIL`.
- Each conciergerie is billed for itself — no group invoice.
- After creating a local invoice the cron pushes it to IMS (below) and stores
  the IMS invoice number in `invoices.external_ref`.

## Annual subscriptions

Paid once through the landing checkout (`/checkout?billing=annual`), outside
the monthly model:

- `conciergeries.billing_period = 'annual'` + `plan_until` = coverage end.
- While `plan_until` is in the future: the monthly cron skips the
  conciergerie (counted as `annual` in the response) and `changeMyPlan` +
  the settings UI block plan switches — an annual plan runs its full year.
- At expiry the row re-enters monthly billing automatically; the customer
  can then pick a new plan. Provisioning is **manual for now** — when a
  Revolut annual order completes, run:

```sql
UPDATE conciergeries
SET billing_period = 'annual', plan = '<plan>', plan_until = now() + interval '1 year'
WHERE name = '<conciergerie>';
```

(Back to monthly: `SET billing_period = 'monthly', plan_until = NULL`.)

## Discounts

```sql
UPDATE conciergeries SET discount = 40 WHERE name = 'CMD Breizh';
```

The discount applies to every generated invoice (list price − %). Historical
invoices keep the % they were generated with.

## IMS sync (ims.fims.fi)

IMS exposes `POST {IMS_API_URL}/import-invoice` (Bearer `IMS_IMPORT_SECRET`),
implemented in `convex/importInvoice.ts` + `convex/router.ts` of the IMS repo.
It finds/creates the client (by name) and the service (by label — the label
carries the period, e.g. `… Pro (03/2026)`, which makes re-imports
idempotent), then inserts a `sent` invoice. Secrets live in env vars on both
sides — never in code.

## cron-job.org setup

Create a job:

- **URL**: `https://app.job-conciergerie.fr/api/bill-subscriptions`
- **Method**: `POST` (GET works too)
- **Schedule**: monthly, day 1, e.g. `06:00` — cron `0 6 1 * *`
- **Headers**: `Authorization: Bearer <CRON_SECRET>`
- **Body**: none
- **Expected response**: `200` with `{"period":"YYYY-MM","billed":N,"skipped":N,"annual":N}`;
  `401` = wrong/missing secret. Test manually with cron-job.org's "Execute
  now" — a same-period re-run returns `skipped` for already-billed rows.

Same pattern as `/api/check-late-missions` if that job already exists in the
account — copy its auth header.
