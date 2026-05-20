import { sql } from '@/app/db/db';

export interface EmailLogRow {
  id: string;
  type: string;
  to: string;
  subject: string | null;
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
): Promise<void> => {
  try {
    await sql`
      INSERT INTO email_logs (type, "to", subject, success, error)
      VALUES (${type}, ${to}, ${subject ?? null}, ${success}, ${error ?? null})
    `;
  } catch (err) {
    console.error('Error inserting email log:', err);
  }
};
