#!/usr/bin/env bun
/**
 * Script to resend emails that were marked as 'dev: not sent'
 *
 * This script:
 * 1. Fetches all email_logs entries where error = 'dev: not sent'
 * 2. For each email:
 *    - If body exists, sends the full email content
 *    - If body is null, creates a summary apology email with a list of all subjects
 * 3. Sleeps 3 seconds between each email send
 * 4. If successful, marks the email error as null
 *
 * Usage:
 *   - Normal mode: bun scripts/resend-dev-emails.ts
 *   - Dry run mode: bun scripts/resend-dev-emails.ts --dry-run
 *   - Dry run mode (short): bun scripts/resend-dev-emails.ts -d
 */

import { sql } from '@/app/db/db';
import type { SendMailOptions } from 'nodemailer';
import nodemailer from 'nodemailer';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Strip HTML tags and convert to plain text for terminal display
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '') // Remove all remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n') // Remove excessive empty lines
    .trim();
}

// Send email via SMTP
async function sendEmail(
  email: SendMailOptions,
  dryRun: boolean = false,
): Promise<{ success: boolean; error?: string }> {
  const plainText = stripHtml(email.html as string);

  if (dryRun) {
    console.log(`  [DRY RUN] Would send email to: ${email.to}`);
    console.log(`  [DRY RUN] Subject: ${email.subject}`);
    console.log(`  [DRY RUN] Body:`);
    console.log('  ' + plainText.split('\n').join('\n  '));
    return { success: true };
  }

  try {
    console.log(`  Sending email to: ${email.to}`);
    console.log(`  Subject: ${email.subject}`);
    console.log(`  Body:`);
    console.log('  ' + plainText.split('\n').join('\n  '));

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

// Update email log to mark as sent
async function markEmailAsSent(id: string, dryRun: boolean = false): Promise<void> {
  if (dryRun) {
    console.log(`  [DRY RUN] Would mark email ${id} as sent`);
    return;
  }

  try {
    await sql`
      UPDATE email_logs
      SET error = NULL, success = true, sent_at = NOW()
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error('Error updating email log:', error);
  }
}

// Group emails by recipient for summary emails
interface EmailGroup {
  to: string;
  emails: Array<{ id: string; subject: string | null; type: string }>;
  allIds: string[]; // Keep track of all original email IDs for marking as sent
}

async function main() {
  // Check for dry run flag
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');
  if (dryRun) {
    console.log('⚠️ DRY RUN MODE - No emails will be sent, database will not be modified');
  }

  try {
    console.log('Fetching emails with error "dev: not sent"...');

    const result = await sql`
      SELECT id, type, "to", subject, body
      FROM email_logs
      WHERE error = 'dev: not sent'
      ORDER BY sent_at ASC
    `;

    const emails = result as unknown as Array<{
      id: string;
      type: string;
      to: string;
      subject: string | null;
      body: string | null;
    }>;

    console.log(`Found ${emails.length} emails to resend`);

    if (emails.length === 0) {
      console.log('No emails to resend. Exiting.');
      return;
    }

    // Separate emails with and without body
    const emailsWithBody = emails.filter(e => e.body);
    const emailsWithoutBody = emails.filter(e => !e.body);

    console.log(`- ${emailsWithBody.length} emails with body (will resend full content)`);
    console.log(`- ${emailsWithoutBody.length} emails without body (will send summary)`);

    // Process emails with body - resend full content
    for (const email of emailsWithBody) {
      console.log(`Resending email to ${email.to}: ${email.subject || '(no subject)'}`);

      const { success, error } = await sendEmail(
        {
          to: email.to,
          subject: email.subject || 'Job Conciergerie Notification',
          html: email.body || '',
        },
        dryRun,
      );

      if (success) {
        console.log(`  ✓ Email sent successfully`);
        await markEmailAsSent(email.id, dryRun);
      } else {
        console.error(`  ✗ Failed to send email: ${error}`);
      }

      // Sleep 3 seconds between sends
      await sleep(3000);
    }

    // Group emails without body by recipient
    const groupedEmails = new Map<string, EmailGroup>();
    for (const email of emailsWithoutBody) {
      if (!groupedEmails.has(email.to)) {
        groupedEmails.set(email.to, { to: email.to, emails: [], allIds: [] });
      }
      const group = groupedEmails.get(email.to)!;
      group.emails.push({
        id: email.id,
        subject: email.subject,
        type: email.type,
      });
      group.allIds.push(email.id);
    }

    // Deduplicate subjects within each group
    for (const group of groupedEmails.values()) {
      const uniqueSubjects = new Set<string>();
      group.emails = group.emails.filter(email => {
        const subjectKey = email.subject || '(sans sujet)';
        if (uniqueSubjects.has(subjectKey)) {
          return false;
        }
        uniqueSubjects.add(subjectKey);
        return true;
      });
    }

    // Send summary emails for each recipient
    for (const [recipient, group] of groupedEmails) {
      console.log(`Sending summary email to ${recipient} for ${group.emails.length} missed emails`);

      const subject = `⚠️ Emails manqués - Résumé (${group.emails.length} emails)`;
      const body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Emails manqués</h2>
          <p>Bonjour,</p>
          <p>Nous vous prions de nous excuser pour les emails qui n'ont pas pu être envoyés précédemment.</p>
          <p>Voici la liste des emails qui ont été manqués :</p>
          <ul style="background-color: #fef2f2; padding: 15px; border-radius: 5px; border: 1px solid #dc2626;">
            ${group.emails.map(e => `<li><strong>${e.subject || '(sans sujet)'}</strong></li>`).join('')}
          </ul>
          <p>Si vous avez besoin de plus d'informations sur ces emails, n'hésitez pas à nous contacter.</p>
          <p style="color: #6b7280; font-size: 12px;">Job Conciergerie - Système de récupération d'emails</p>
        </div>
      `;

      const { success, error } = await sendEmail(
        {
          to: recipient,
          subject,
          html: body,
        },
        dryRun,
      );

      if (success) {
        console.log(`  ✓ Summary email sent successfully`);
        // Mark all original emails in this group as sent (including duplicates)
        for (const id of group.allIds) {
          await markEmailAsSent(id, dryRun);
        }
      } else {
        console.error(`  ✗ Failed to send summary email: ${error}`);
      }

      // Sleep 3 seconds between sends
      await sleep(3000);
    }

    console.log('✓ All emails processed');
  } catch (error) {
    console.error('✗ Script failed:', error);
    process.exit(1);
  }
}

main();
