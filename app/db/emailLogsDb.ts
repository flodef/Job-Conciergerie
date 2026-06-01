import { sql } from '@/app/db/db';

export interface EmailLogRow {
  id: string;
  type: string;
  to: string;
  subject: string | null;
  body: string | null;
  success: boolean;
  error: string | null;
  sent_at: Date;
}

export const insertEmailLog = async (
  type: string,
  to: string,
  subject: string | null,
  success: boolean,
  error?: string,
  body?: string,
): Promise<void> => {
  try {
    await sql`
      INSERT INTO email_logs (type, "to", subject, body, success, error)
      VALUES (${type}, ${to}, ${subject ?? null}, ${body ?? null}, ${success}, ${error ?? null})
    `;
  } catch (err) {
    console.error('Error inserting email log:', err);
  }
};
