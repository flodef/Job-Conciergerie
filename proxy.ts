import { createServerClient } from '@supabase/ssr';
import { navigationRoutes } from '@/app/utils/navigation';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Host dispatch (Tradiz pattern): the apex/www host serves the public site
// (route group (site)); the app keeps working on any host (app.<domain> in
// prod, localhost in dev). demo.<domain> is reserved for Phase E — it will
// get an x-demo marker rather than a separate branch.
const BASE_DOMAIN = 'job-conciergerie.fr';
const APP_HOST = `app.${BASE_DOMAIN}`;
const LANDING_HOSTS = new Set([BASE_DOMAIN, `www.${BASE_DOMAIN}`]);
// Site routes reachable without a session, on every host
const SITE_PUBLIC_PATHS = new Set(['/landing', '/checkout']);
// Bearer-credential links (magic/enrollment/admin/demo): `/<id>` must reach the
// [id] page even with no cookies — it adopts the credential itself.
// The loose legacy-id pattern also matches app routes (missions, homes…) —
// exclude them so they keep going through the auth check.
const ID_PATH = /^\/(?:[0-9a-z]{2,26}|v2_[0-9a-f]{32})$/;
const isIdPath = (path: string) =>
  ID_PATH.test(path) && !navigationRoutes.includes(path) && path !== '/waiting' && path !== '/error';

// One-time credential migration: the device-id cookies were issued host-only
// on www — re-issue them domain-wide on the redirect response so the browser
// sends them to app.<domain> on the next request. Device ids stay raw values;
// localStorage on the new origin is seeded from the session the cookie resolves.
const migrateCookies = (request: NextRequest, response: NextResponse) => {
  for (const name of ['user_id', 'user_type']) {
    const value = request.cookies.get(name)?.value;
    if (value) response.cookies.set(name, value, { domain: `.${BASE_DOMAIN}`, path: '/' });
  }
  return response;
};

// This function can be marked `async` if using `await` inside
export async function proxy(request: NextRequest) {
  // The host HEADER (not nextUrl.hostname — dev normalizes it to the bind
  // address) is what the platform reports.
  const host = (request.headers.get('host') ?? '').split(':')[0];

  // demo.<domain> serves the same app against the dedicated demo database —
  // mark the request so server code (db.ts) picks DEMO_DATABASE_URL. API
  // routes skip middleware entirely, so db.ts also checks the host itself.
  const requestHeaders = new Headers(request.headers);
  if (host.startsWith('demo.')) requestHeaders.set('x-demo', '1');

  // Create supabaseResponse that we'll modify with refreshed cookies
  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Refresh Supabase auth session if needed - required for Server Components
  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Keep the demo marker — rebuilding from `request` alone would drop it.
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    });

    // This refreshes the session if it exists and is expired
    await supabase.auth.getUser();
  }

  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Skip proxy for API routes, static files, server actions, and direct user ID access
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.includes('.') ||
    path === '/favicon.ico' ||
    request.headers.get('Next-Action')
  )
    return NextResponse.next();

  // Apex / www → '/' serves the landing (URL stays '/', renders (site)/landing).
  const isLandingHost = LANDING_HOSTS.has(host);
  if (isLandingHost && path === '/') {
    // Existing users (installed PWA, bookmarks) open '/' on the site host —
    // send them to the app instead of showing them the marketing page.
    // Prospects have no user_id cookie and get the landing.
    if (request.cookies.get('user_id')?.value) {
      const url = request.nextUrl.clone();
      url.hostname = APP_HOST;
      url.protocol = 'https:';
      url.port = '';
      return migrateCookies(request, NextResponse.redirect(url, 307));
    }
    const url = request.nextUrl.clone();
    url.pathname = '/landing';
    return NextResponse.rewrite(url);
  }

  // Public site pages — no session required, on every host
  if (SITE_PUBLIC_PATHS.has(path)) return supabaseResponse;

  // Landing hosts are site-only: every other path (app routes, magic /<id>
  // links, /waiting…) lives on app.<domain>. The 307 carries the credentials
  // across origins via the domain-wide cookie re-issue.
  if (isLandingHost) {
    const url = request.nextUrl.clone();
    url.hostname = APP_HOST;
    url.protocol = 'https:';
    url.port = '';
    return migrateCookies(request, NextResponse.redirect(url, 307));
  }

  // Device-credential links /<id> must reach the enrollment page even without
  // cookies — a fresh device has none yet (admin bootstrap links).
  if (isIdPath(path)) return supabaseResponse;

  // Get the user ID and user type from cookies
  const userId = request.cookies.get('user_id')?.value;
  const userType = request.cookies.get('user_type')?.value;

  // If no user ID or user type, redirect to home page — except bearer-credential
  // links (/<id>): the [id] page adopts the credential on unenrolled devices,
  // which is precisely the fresh-browser case (magic/enrollment/admin/demo links).
  if (!userId || !userType) {
    if (path !== '/' && !isIdPath(path)) return NextResponse.redirect(new URL('/', request.url));

    return supabaseResponse;
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

      return supabaseResponse;
    } else {
      // Not authenticated, redirect to error or waiting page
      if (navigationRoutes.includes(path)) return NextResponse.redirect(new URL('/error', request.url));
      // Skip if path matches a user ID pattern (legacy base36 or rotated v2_<hex32>)
      else if (
        (path === '/' || path === '/error' || !/^\/?(?:[0-9a-z]{2,26}|v2_[0-9a-f]{32})$/.test(path)) &&
        path !== '/waiting'
      )
        return NextResponse.redirect(new URL('/waiting', request.url));

      return supabaseResponse;
    }
  } catch (error) {
    console.error('Middleware error:', error);
    // Redirect to error page for database connection issues
    if (path !== '/error') return NextResponse.redirect(new URL('/error', request.url));

    return supabaseResponse;
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
