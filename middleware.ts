import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Skip middleware for API routes, static files, etc.
  if (path.startsWith('/_next') || path.startsWith('/api') || path.includes('.') || path === '/favicon.ico') {
    return NextResponse.next();
  }

  // Get the user ID and user type from cookies
  const userId = request.cookies.get('user_id')?.value;
  const userType = request.cookies.get('user_type')?.value;

  // If no user ID or user type, redirect to home page
  if (!userId || !userType) {
    if (path !== '/') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  try {
    // Make a fetch request to our own API to check user status
    const response = await fetch(new URL('/api/auth/', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, userType }),
    });

    if (!response.ok) {
      throw new Error('Failed to check user status');
    }

    const { userType: foundUserType, data } = await response.json();

    // Handle redirects based on user type and status
    if (foundUserType === 'conciergerie' || (foundUserType === 'employee' && data.status === 'accepted')) {
      if (path !== '/missions') {
        return NextResponse.redirect(new URL('/missions', request.url));
      }
    } else {
      if (path !== '/waiting') {
        return NextResponse.redirect(new URL('/waiting', request.url));
      }
    }
  } catch (error) {
    console.error('Middleware error:', error);
    if (path !== '/') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
