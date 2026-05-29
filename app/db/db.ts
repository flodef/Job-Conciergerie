import { UserType } from '@/app/contexts/authProvider';
import postgres from 'postgres';

/**
 * SQL template literal for database queries
 * Works with any Postgres (Neon, Supabase, etc.) by just changing DATABASE_URL
 */
export const sql = postgres(process.env.DATABASE_URL!, {
  prepare: false, // Required for Supabase connection pooling
});

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
