import { getConciergerieByName } from '@/app/db/conciergerieDb';
import { sendContactEmail } from '@/app/utils/mailSender';

/**
 * Billing emails — server-only helpers called by the /api/bill-subscriptions
 * cron. Deliberately NOT in a 'use server' module: as actions they would be
 * public endpoints anyone could invoke, letting a forged call send fake
 * invoices to a conciergerie's real address or spam the admin mailbox.
 * Failures queue in failed_emails (type 'contact') for the retry cron.
 */

/**
 * Monthly subscription invoice — sent to the conciergerie's own registered
 * address (resolved server-side by name). Fixed template.
 */
export async function sendInvoiceEmail(
  conciergerieName: string,
  monthLabel: string,
  planName: string,
  amount: number,
  fullAmount?: number,
): Promise<boolean> {
  const conciergerie = await getConciergerieByName(conciergerieName);
  if (!conciergerie?.email) return false;
  const discounted = fullAmount !== undefined && fullAmount !== amount;
  return sendContactEmail(
    conciergerie.email,
    `Job Conciergerie — facture de ${monthLabel}`,
    [
      `Bonjour,`,
      ``,
      `Votre abonnement Job Conciergerie pour ${monthLabel} est facturé au forfait le plus élevé utilisé ce mois-ci :`,
      ``,
      `  ${planName} — ${amount} €${discounted ? ` (tarif ${fullAmount} €, remise appliquée)` : ''}`,
      ``,
      `Pour toute question, répondez à cet email.`,
      ``,
      `L'équipe Job Conciergerie`,
    ].join('\n'),
  );
}

/**
 * Monthly billing recap sent to the admin (env address). Fixed template —
 * only the cron calls this.
 */
export async function sendBillingSummaryEmail(monthLabel: string, lines: string[], skipped: number): Promise<boolean> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'contact@job-conciergerie.fr';
  return sendContactEmail(
    adminEmail,
    `Facturation ${monthLabel} — ${lines.length} facture${lines.length > 1 ? 's' : ''}`,
    `Factures générées pour ${monthLabel} :\n\n${lines.join('\n')}\n\n${skipped} déjà facturée(s) (ignorée(s)).`,
  );
}
