// app/api/idCheck/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const companies = process.env.COMPANIES?.split(',');

  if (!userId) {
    return NextResponse.json({ error: 'user_id parameter is required' }, { status: 400 });
  }

  if (!companies || companies.length === 0) {
    return NextResponse.json({ error: 'No companies configured' }, { status: 500 });
  }

  const envVars = companies.reduce((acc, company) => {
    const values = process.env[company]?.split(',') || [];
    return { ...acc, [company]: values };
  }, {} as Record<string, string[]>);

  for (const [company, ids] of Object.entries(envVars)) {
    if (ids.includes(userId)) {
      return NextResponse.json({
        authorized: true,
        company,
        message: `User authorized for ${company}`,
      });
    }
  }

  return NextResponse.json({ authorized: false, message: 'User not authorized for any company' }, { status: 403 });
}
