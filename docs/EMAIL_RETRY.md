# Email retry system

This document explains the server-side email retry queue and how to configure
the external scheduler that processes it.

## Overview

When an email send fails (SMTP timeout, rate-limit, transient network error,
etc.), the failure is recorded in the `failed_emails` PostgreSQL table on the
Neon database. A cron-like external scheduler then calls
`POST /api/retry-emails` every ~10 minutes to retry pending entries.

```
[ Server action ] ─ SMTP fails ──▶ [ failed_emails table ]
                                            ▲
                                            │ retry
[ External cron ] ──▶ POST /api/retry-emails
```

After **20 unsuccessful attempts** (~3 hours of retrying), an alert email
is sent to `ADMIN_ALERT_EMAIL` (defaulting to `contact@job-conciergerie.fr`)
with the email type, the original payload and the last SMTP error, then the
row is removed from the queue.

## Setup

### 1. Run the SQL migration

In the Neon SQL Editor (or via `psql`), execute the contents of
`scripts/migrations/001_failed_emails.sql`. It is idempotent (`IF NOT EXISTS`).

### 2. Set the environment variables

Add the following to your `.env.local` (development) **and** to your Vercel
project settings (production):

```
CRON_SECRET=<a long random string, e.g. `openssl rand -hex 32`>
ADMIN_ALERT_EMAIL=contact@job-conciergerie.fr   # optional override
```

### 3. Schedule the cron

Two options - pick one. Both call the same endpoint with the same auth
header.

#### Option A — cron-job.org (free, recommended for Vercel Hobby)

1. Create a free account at <https://cron-job.org>.
2. Add a new cron job:
   - **URL:** `https://<your-domain>/api/retry-emails`
   - **Schedule:** every 10 minutes
   - **Method:** `POST`
   - **Headers:**
     ```
     Authorization: Bearer <same value as CRON_SECRET>
     ```
3. Save and enable. The dashboard will show success/failure history.

#### Option B — GitHub Actions (free)

Create `.github/workflows/email-retry.yml`:

```yaml
name: Retry failed emails
on:
  schedule:
    - cron: '*/10 * * * *'
  workflow_dispatch:
jobs:
  retry:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://<your-domain>/api/retry-emails
```

Add `CRON_SECRET` as a repository secret (Settings → Secrets → Actions).

#### Option C — Vercel Cron (Pro plan only for sub-daily frequency)

Add a `vercel.json` at the project root:

```json
{
  "crons": [{ "path": "/api/retry-emails", "schedule": "*/10 * * * *" }]
}
```

Vercel automatically attaches the auth via `Authorization: Bearer <CRON_SECRET>`
when the env variable is set. ⚠️ Vercel Hobby only allows daily crons; use
options A or B for 10-minute frequency.

## Verifying it works

1. Temporarily break the SMTP credentials (e.g. set a wrong `SMTP_PASSWORD`).
2. Trigger any flow that sends an email (e.g. accept a mission).
3. The email is rejected: `failed_emails` should contain a new row.
4. Restore SMTP credentials.
5. Trigger the cron manually:
   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     https://<your-domain>/api/retry-emails
   ```
6. The endpoint returns `{ processed, succeeded, failed, abandoned }` and the
   row is removed from `failed_emails` on success.

## Database maintenance

The retry endpoint cleans up rows automatically. To inspect manually:

```sql
SELECT id, type, attempts, last_error, created_at
FROM failed_emails
ORDER BY created_at DESC;
```

To purge everything (drastic):

```sql
TRUNCATE failed_emails;
```
