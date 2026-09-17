import { getExistingUserTypeResilient } from '@/app/db/db';
import { impersonateCookieName, verifyImpersonationToken } from '@/app/db/session';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) return NextResponse.json({ userType: null }, { status: 200 });

    const userType = await getExistingUserTypeResilient(userId);

    // An admin viewing the app as another row carries a signed `impersonate`
    // cookie — report the impersonated type so the proxy's userType check
    // doesn't bounce the session to /waiting. The HMAC signature is proof an
    // admin action minted it; anything invalid falls back to the real type.
    const impersonated = verifyImpersonationToken(request.cookies.get(impersonateCookieName)?.value);

    return NextResponse.json({ userType: impersonated?.userType ?? userType }, { status: 200 });
  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json({ error: 'Failed to check user status' }, { status: 500 });
  }
}
