import { isProduction } from '@/app/actions/environment';
import { isDemoRequest } from '@/app/db/db';
import { insertEmailLog } from '@/app/db/emailLogsDb';
import { insertFailedEmail, type FailedEmailType } from '@/app/db/failedEmailsDb';
import type { SendMailOptions } from 'nodemailer';
import nodemailer from 'nodemailer';

/**
 * Internal mail transport — NOT a 'use server' module, so nothing here is
 * reachable as a public action. actions/email.ts composes the typed emails;
 * server-only callers (billing cron) reach this transport directly.
 */

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Low-level SMTP send - returns { success, error }. Used directly when the
// retry queue must be bypassed (e.g. the give-up admin alert).
export async function sendEmail(email: SendMailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    await transporter.sendMail({
      ...email,
      from: `"Job Conciergerie" <${process.env.SMTP_FROM_EMAIL}>`,
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Send a contact/support email (generic message to a specific recipient).
 */
export async function sendContactEmail(to: string, subject: string, body: string, isRetry = false): Promise<boolean> {
  return deliver(
    {
      to,
      subject,
      text: body,
    },
    'contact',
    { to, subject, body },
    isRetry,
  );
}

/**
 * Attempt to send an email. If SMTP fails AND this is not itself a retry call,
 * the payload is persisted in the failed_emails queue so the cron job can retry later.
 */
export async function deliver(
  email: SendMailOptions,
  type: FailedEmailType,
  payload: Record<string, unknown>,
  isRetry: boolean,
): Promise<boolean> {
  const to = Array.isArray(email.to) ? email.to.join(', ') : (email.to as string);
  const isProd = await isProduction();
  // Demo requests (demo.<domain>) never send real email — the demo database
  // holds fake addresses anyway. Logged as sent, like the dev path.
  const isDemo = await isDemoRequest();

  if (!isProd || isDemo) {
    console.log(`[${isDemo ? 'DEMO' : 'DEV'}] Email skipped — type: ${type}, to: ${to}, subject: ${email.subject}`);
    await insertEmailLog(
      type,
      to,
      (email.subject as string) ?? null,
      true,
      `${isDemo ? 'demo' : 'dev'}: not sent`,
      email.html as string,
    );
    return true;
  }

  const { success, error } = await sendEmail(email);
  await insertEmailLog(type, to, (email.subject as string) ?? null, success, error, email.html as string);
  if (!success && !isRetry) await insertFailedEmail(type, payload, error);

  return success;
}
