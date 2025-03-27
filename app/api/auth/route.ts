import { getExistingUserType } from '@/app/db/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) return NextResponse.json({ userType: null }, { status: 200 });

    // Check if user exists in the database
    const userType = await getExistingUserType(userId);

    return NextResponse.json({ userType }, { status: 200 });
  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json({ error: 'Failed to check user status' }, { status: 500 });
  }
}
