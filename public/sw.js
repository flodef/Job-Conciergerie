/// <reference lib="webworker" />

console.log('[SW] Service Worker script loaded!');

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PAGES_CACHE = `pages-${CACHE_VERSION}`;
const RSC_CACHE = `rsc-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const IMAGES_CACHE = `images-${CACHE_VERSION}`;

const STATIC_ASSETS = ['/', '/manifest.json', '/icon-192x192.png', '/icon-512x512.png'];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] INSTALL EVENT - Service Worker installing');
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      }),
  );
});

// Message event - handle skip waiting
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] ACTIVATE EVENT - Service Worker activating');
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        console.log('[SW] Cleaning old caches');
        return Promise.all(
          cacheNames
            .filter(
              name =>
                name.includes(CACHE_VERSION) &&
                ![STATIC_CACHE, PAGES_CACHE, RSC_CACHE, API_CACHE, IMAGES_CACHE].includes(name),
            )
            .map(name => caches.delete(name)),
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      }),
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  console.log('[SW] FETCH EVENT FIRED:', event.request.url.substring(0, 100));

  const { request } = event;
  const url = new URL(request.url);

  // Debug: log ALL same-origin requests
  if (url.origin === self.location.origin) {
    const rscHeader = request.headers.get('RSC');
    const nextRscHeader = request.headers.get('Next-Router-State-Tree');
    const accept = request.headers.get('Accept');
    console.log(
      '[SW] Same-origin fetch:',
      request.method,
      url.pathname + url.search,
      'mode:',
      request.mode,
      'RSC header:',
      rscHeader,
      'Next-Router:',
      !!nextRscHeader,
      'Accept:',
      accept?.substring(0, 50),
    );
  }

  // Handle RSC (React Server Component) requests FIRST - Next.js uses POST for navigation
  // RSC requests are identified by the Next-Router-State-Tree header or Accept: text/x-component
  const isRSC =
    request.headers.has('Next-Router-State-Tree') || request.headers.get('Accept')?.includes('text/x-component');
  if (isRSC) {
    event.respondWith(handleRSCRequest(request));
    return;
  }

  // Handle non-GET requests (POST, PUT, DELETE) - can't cache but can return offline error
  if (request.method !== 'GET') {
    // Only handle same-origin API requests
    if (url.origin === self.location.origin) {
      event.respondWith(handleNonGetRequest(request));
    }
    return;
  }

  // Skip cross-origin requests (except for Supabase images)
  if (url.origin !== self.location.origin && !url.hostname.includes('supabase.co')) return;

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/rest/v1/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle Supabase images
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/')) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle RSC requests with stale-while-revalidate
async function handleRSCRequest(request) {
  const cache = await caches.open(RSC_CACHE);
  const cached = await cache.match(request);

  console.log('[SW] RSC request:', request.url, 'cached:', !!cached, 'online:', navigator.onLine);

  // Return cached version immediately if available (stale-while-revalidate)
  if (cached) {
    // Update cache in background if online
    if (navigator.onLine) {
      fetch(request.clone())
        .then(response => {
          console.log(
            '[SW] RSC background update:',
            request.url,
            'ok:',
            response.ok,
            'redirected:',
            response.redirected,
          );
          // Only cache successful non-redirect responses
          if (response.ok && !response.redirected) {
            cache.put(request, response.clone());
          }
        })
        .catch(err => console.error('[SW] RSC background update failed:', err));
    }
    return cached;
  }

  // If offline and no cache, return error - don't fallback to wrong page
  if (!navigator.onLine) {
    return new Response(JSON.stringify({ error: 'Page not cached for offline use' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(request.clone());
    console.log(
      '[SW] RSC fetch success:',
      request.url,
      'ok:',
      response.ok,
      'redirected:',
      response.redirected,
      'status:',
      response.status,
    );
    // Only cache successful non-redirect responses
    if (response.ok && !response.redirected) {
      await cache.put(request, response.clone());
      console.log('[SW] RSC cached:', request.url);
    }
    return response;
  } catch (error) {
    console.error('[SW] RSC fetch failed:', request.url, error);
    // Return error for offline/failed RSC requests
    return new Response(JSON.stringify({ error: 'Page not cached for offline use' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  const cache = await caches.open(PAGES_CACHE);
  const cached = await cache.match(request);

  // Update cache in background if online
  if (navigator.onLine) {
    fetch(request.url, { redirect: 'follow' })
      .then(response => {
        // Only cache successful non-redirect responses
        if (response.ok && !response.redirected) {
          cache.put(request, response.clone());
        }
      })
      .catch(() => {});
  }

  // Return cached version if available
  if (cached) return cached;

  // If offline and no cache, try to return the index page
  if (!navigator.onLine) {
    const fallback = await caches.match('/');
    if (fallback) return fallback;
  }

  try {
    const response = await fetch(request, { redirect: 'follow' });
    // Only cache successful non-redirect responses
    if (response.ok && !response.redirected) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const fallback = await caches.match('/');
    if (fallback) return fallback;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Handle API requests with stale-while-revalidate
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  // Update cache in background if online
  if (navigator.onLine) {
    fetch(request.url, { redirect: 'follow' })
      .then(response => {
        // Only cache successful non-redirect responses
        if (response.ok && !response.redirected) {
          cache.put(request, response.clone());
        }
      })
      .catch(() => {});
  }

  // Return cached version if available
  if (cached) return cached;

  try {
    const response = await fetch(request, { redirect: 'follow' });
    // Only cache successful non-redirect responses
    if (response.ok && !response.redirected) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle image requests - cache first
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGES_CACHE);
  const cached = await cache.match(request);

  if (cached) return cached;

  try {
    const response = await fetch(request, { redirect: 'follow' });
    // Only cache successful non-redirect responses
    if (response.ok && !response.redirected) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Handle static assets - cache first
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) return cached;

  // If offline and not cached, return network error (browser will handle gracefully)
  if (!navigator.onLine) {
    return new Response(null, {
      status: 408,
      statusText: 'Request Timeout',
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  try {
    const response = await fetch(request, { redirect: 'follow' });
    // Only cache successful non-redirect responses
    if (response.ok && !response.redirected) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return network error for offline/failed requests
    return new Response(null, {
      status: 408,
      statusText: 'Request Timeout',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Handle non-GET requests (POST, PUT, DELETE) - pass through online, graceful offline error
async function handleNonGetRequest(request) {
  try {
    const response = await fetch(request, { redirect: 'follow' });
    return response;
  } catch (error) {
    // Return a JSON error response that the app can handle
    const isJsonRequest =
      request.headers.get('content-type')?.includes('application/json') ||
      request.headers.get('accept')?.includes('application/json');

    if (isJsonRequest) {
      return new Response(JSON.stringify({ error: 'Offline', message: 'Cannot perform action while offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Cannot perform action while offline', { status: 503, statusText: 'Service Unavailable' });
  }
}
