import { UserType } from '@/app/contexts/authProvider';
import postgres from 'postgres';

// Create SQL client using DATABASE_URL - works with any Postgres (Neon, Supabase, etc.)
const sqlClient = postgres(process.env.DATABASE_URL!, {
  prepare: false, // Required for Supabase connection pooling
});

/**
 * SQL template literal for database queries
 * Works with any Postgres database by just changing DATABASE_URL
 */
export const sql = sqlClient;

/**
 * Check if a user exists and what type they are
 */
export async function getExistingUserType(userId: string): Promise<UserType | null> {
  try {
    const result = await sql`
      SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM conciergeries WHERE ${userId} = ANY(id)) THEN 'conciergerie'
        WHEN EXISTS (SELECT 1 FROM employees WHERE ${userId} = ANY(id) AND status = 'accepted') THEN 'employee'
        ELSE NULL
      END AS result
    `;

    return result[0].result ? (result[0].result as UserType) : null;
  } catch (error) {
    console.error('Error checking user status:', error);
    return null;
  }
}
