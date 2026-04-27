import { retryQueuedEmail, sendAdminAlertEmail } from '@/app/actions/email';
import {
  deleteFailedEmail,
  getEmailsToRetry,
  getExhaustedEmails,
  markAttempt,
} from '@/app/db/failedEmailsDb';
import { NextRequest, NextResponse } from 'next/server';

const RETRY_INTERVAL_MINUTES = 10;
const MAX_ATTEMPTS = 20;

/**
 * Cron endpoint that processes the failed_emails queue.
 *
 * Secured via a bearer token in the Authorization header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Should be called every ~10 minutes by an external scheduler (cron-job.org,
 * GitHub Actions, Vercel Cron, ...).
 */
async function handleRetry(request: NextRequest) {
  // Auth: require a bearer token matching CRON_SECRET
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const toRetry = await getEmailsToRetry(RETRY_INTERVAL_MINUTES, MAX_ATTEMPTS);
  const exhausted = await getExhaustedEmails(MAX_ATTEMPTS);

  let succeeded = 0;
  let failed = 0;
  let abandoned = 0;

  // Process emails that are due for retry
  for (const row of toRetry) {
    try {
      const ok = await retryQueuedEmail(row.type, row.payload);
      if (ok) {
        await deleteFailedEmail(row.id);
        succeeded++;
      } else {
        await markAttempt(row.id, 'SMTP send returned false');
        failed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error retrying email ${row.id} (${row.type}):`, err);
      await markAttempt(row.id, msg);
      failed++;
    }
  }

  // Notify admin and purge emails that exhausted MAX_ATTEMPTS
  for (const row of exhausted) {
    try {
      await sendAdminAlertEmail(row.type, row.payload, row.attempts, row.last_error);
      await deleteFailedEmail(row.id);
      abandoned++;
    } catch (err) {
      console.error(`Error notifying admin for exhausted email ${row.id}:`, err);
      // Keep the row: we'll retry the alert next run
    }
  }

  return NextResponse.json({
    processed: toRetry.length,
    succeeded,
    failed,
    abandoned,
  });
}

export async function GET(request: NextRequest) {
  return handleRetry(request);
}

export async function POST(request: NextRequest) {
  return handleRetry(request);
}
