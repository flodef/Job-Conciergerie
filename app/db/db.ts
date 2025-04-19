import { UserType } from '@/app/contexts/authProvider';
import { neon } from '@neondatabase/serverless';

// Initialize neon client
export const sql = neon(process.env.DATABASE_URL as string);

/**
 * Check if a user exists and what type they are
 */
export async function getExistingUserType(userId: string): Promise<UserType | null> {
  try {
    const result = await sql`
      SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM conciergeries WHERE ${userId} = ANY(id)) THEN 'conciergerie'
        WHEN EXISTS (SELECT 1 FROM employees WHERE id = ${userId} AND status = 'accepted') THEN 'employee'
        ELSE NULL
      END AS result
    `;

    return result[0].result ? (result[0].result as UserType) : null;
  } catch (error) {
    console.error('Error checking user status:', error);
    return null;
  }
}
