import { sql } from '@/app/db/db';

export type FailedEmailType =
  | 'verification'
  | 'registration'
  | 'acceptance'
  | 'missionStatus'
  | 'lateCompletion'
  | 'missionAcceptance'
  | 'missionUpdated'
  | 'missionRemoved'
  | 'newDevice';

export interface FailedEmailRow {
  id: string;
  type: FailedEmailType;
  payload: Record<string, unknown>;
  attempts: number;
  last_attempt: Date | null;
  last_error: string | null;
  created_at: Date;
}

/**
 * Insert a new failed email into the retry queue.
 */
export const insertFailedEmail = async (
  type: FailedEmailType,
  payload: Record<string, unknown>,
  lastError?: string,
): Promise<string | null> => {
  try {
    const result = await sql`
      INSERT INTO failed_emails (type, payload, attempts, last_attempt, last_error)
      VALUES (${type}, ${JSON.stringify(payload)}, 1, NOW(), ${lastError ?? null})
      RETURNING id
    `;
    return result.length > 0 ? (result[0].id as string) : null;
  } catch (error) {
    console.error('Error inserting failed email:', error);
    return null;
  }
};

/**
 * Fetch emails that are due for a retry attempt.
 * @param retryIntervalMinutes - only emails older than this interval since their last attempt are returned
 * @param maxAttempts - emails at or beyond this number of attempts are excluded (handled separately)
 */
export const getEmailsToRetry = async (
  retryIntervalMinutes = 10,
  maxAttempts = 20,
): Promise<FailedEmailRow[]> => {
  try {
    const result = await sql`
      SELECT id, type, payload, attempts, last_attempt, last_error, created_at
      FROM failed_emails
      WHERE attempts < ${maxAttempts}
        AND (last_attempt IS NULL OR last_attempt < NOW() - (${retryIntervalMinutes} || ' minutes')::INTERVAL)
      ORDER BY created_at ASC
      LIMIT 50
    `;
    return result as FailedEmailRow[];
  } catch (error) {
    console.error('Error fetching emails to retry:', error);
    return [];
  }
};

/**
 * Fetch emails that reached the maximum number of attempts and should be reported.
 */
export const getExhaustedEmails = async (maxAttempts = 20): Promise<FailedEmailRow[]> => {
  try {
    const result = await sql`
      SELECT id, type, payload, attempts, last_attempt, last_error, created_at
      FROM failed_emails
      WHERE attempts >= ${maxAttempts}
      ORDER BY created_at ASC
      LIMIT 50
    `;
    return result as FailedEmailRow[];
  } catch (error) {
    console.error('Error fetching exhausted emails:', error);
    return [];
  }
};

/**
 * Mark a retry attempt as failed, keeping the row in the queue.
 */
export const markAttempt = async (id: string, lastError?: string): Promise<boolean> => {
  try {
    await sql`
      UPDATE failed_emails
      SET attempts = attempts + 1,
          last_attempt = NOW(),
          last_error = ${lastError ?? null}
      WHERE id = ${id}
    `;
    return true;
  } catch (error) {
    console.error('Error marking email attempt:', error);
    return false;
  }
};

/**
 * Delete a row from the queue (used on success or after the admin alert).
 */
export const deleteFailedEmail = async (id: string): Promise<boolean> => {
  try {
    await sql`DELETE FROM failed_emails WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error('Error deleting failed email:', error);
    return false;
  }
};
