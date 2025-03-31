import { navigationRoutes } from '@/app/utils/navigation';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Skip middleware for API routes, static files, and direct user ID access
  if (path.startsWith('/_next') || path.startsWith('/api') || path.includes('.') || path === '/favicon.ico')
    return NextResponse.next();

  // Get the user ID and user type from cookies
  const userId = request.cookies.get('user_id')?.value;
  const userType = request.cookies.get('user_type')?.value;

  // If no user ID or user type, redirect to home page
  if (!userId || !userType) {
    if (path !== '/') return NextResponse.redirect(new URL('/', request.url));

    return NextResponse.next();
  }

  try {
    // Make a fetch request to our own API to check user status
    const response = await fetch(new URL('/api/auth/', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response?.ok || response?.status !== 200) throw new Error('Failed to check user status');

    const { userType: foundUserType } = await response.json();

    // Handle redirects based on user type and status
    if (userType === foundUserType) {
      // If we're on an invalid path, redirect to missions
      if (!navigationRoutes.includes(path)) return NextResponse.redirect(new URL('/missions', request.url));

      return NextResponse.next();
    } else {
      // Not authenticated, redirect to error or waiting page
      if (navigationRoutes.includes(path)) return NextResponse.redirect(new URL('/error', request.url));
      // Skip if path matches a user ID pattern (20-22 characters alphanumeric string)
      else if (!/^\/?[0-9a-z]{2,26}$/.test(path) && path !== '/waiting')
        return NextResponse.redirect(new URL('/waiting', request.url));

      return NextResponse.next();
    }
  } catch (error) {
    console.error('Middleware error:', error);
    // Redirect to error page for database connection issues
    if (path !== '/error') return NextResponse.redirect(new URL('/error', request.url));

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
