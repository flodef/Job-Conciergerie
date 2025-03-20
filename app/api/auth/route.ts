import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL as string);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ userType: null }, { status: 200 });
    }

    // Check if user exists in the database
    const result = await sql`
      SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM conciergerie WHERE id = ${userId}) THEN 'conciergerie'
        WHEN EXISTS (SELECT 1 FROM employee WHERE id = ${userId} AND status = 'accepted') THEN 'employee'
        ELSE NULL
      END AS result
    `;
    return NextResponse.json({ userType: result[0].result }, { status: 200 });
  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json({ error: 'Failed to check user status' }, { status: 500 });
  }
}
