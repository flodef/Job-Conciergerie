import { checkUserExists } from '@/app/actions/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, userType } = await request.json();

    if (!userId || !userType) {
      return NextResponse.json({ userType: null, data: null }, { status: 200 });
    }

    // Check if user exists in the database
    const { userType: foundUserType, userData } = await checkUserExists(userId);

    return NextResponse.json({ userType: foundUserType, data: userData }, { status: 200 });
  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json({ error: 'Failed to check user status' }, { status: 500 });
  }
}
