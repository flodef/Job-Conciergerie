// Push generated invoices into the external invoicing/accounting tool (IMS,
// Convex-backed, served at ims.fims.fi). The IMS side exposes a single HTTP
// endpoint POST /import-invoice guarded by a shared bearer secret.
//
// Env (optional — when unset the billing cron still creates and emails the
// local invoice, it just doesn't sync to the accounting tool):
//   IMS_API_URL        — Convex site URL, e.g. https://<deployment>.convex.site
//   IMS_IMPORT_SECRET  — shared bearer secret (same value set on the Convex
//                        deployment via `npx convex env set`)

export interface ImsInvoicePayload {
  clientName: string;
  clientEmail?: string;
  serviceLabel: string; // stable name, e.g. 'Abonnement Job Conciergerie — Pro'
  periodLabel: string; // e.g. '03/2026' — appended to the invoice item label
  unitPrice: number; // list price before discount
  discount: number; // 0-100 %
  invoiceDate: string; // ISO date
}

export async function importInvoiceToIms(payload: ImsInvoicePayload): Promise<string | null> {
  const apiUrl = process.env.IMS_API_URL;
  const secret = process.env.IMS_IMPORT_SECRET;
  if (!apiUrl || !secret) {
    console.warn('IMS_API_URL / IMS_IMPORT_SECRET not configured — skipping invoice import');
    return null;
  }

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/import-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`IMS import failed (${response.status}): ${await response.text()}`);
      return null;
    }
    const data = await response.json();
    return typeof data.invoiceNumber === 'string' ? data.invoiceNumber : null;
  } catch (error) {
    console.error('IMS import error:', error);
    return null;
  }
}
