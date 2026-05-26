/// <reference lib="webworker" />

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const PAGES_CACHE = `pages-${CACHE_VERSION}`;
const RSC_CACHE = `rsc-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const IMAGES_CACHE = `images-${CACHE_VERSION}`;

const STATIC_ASSETS = ['/', '/manifest.json', '/icon-192x192.png', '/icon-512x512.png'];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(cache => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
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
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
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
        return self.clients.claim();
      }),
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle RSC (React Server Component) requests FIRST - Next.js uses POST for navigation
  if (url.searchParams.has('_rsc')) {
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

  // Update cache in background if online
  if (navigator.onLine) {
    fetch(request, { redirect: 'follow' })
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

  // If offline and no cache, try the navigation page cache as fallback
  if (!navigator.onLine) {
    const url = new URL(request.url);
    const baseUrl = url.origin + url.pathname;
    const pagesCache = await caches.open(PAGES_CACHE);
    const pageFallback = await pagesCache.match(baseUrl);
    if (pageFallback) return pageFallback;

    // Last resort: return the index page
    const indexFallback = await pagesCache.match('/');
    if (indexFallback) return indexFallback;
  }

  try {
    const response = await fetch(request, { redirect: 'follow' });
    // Only cache successful non-redirect responses
    if (response.ok && !response.redirected) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline fallback - try to return the base page
    const url = new URL(request.url);
    const baseUrl = url.origin + url.pathname;
    const pagesCache = await caches.open(PAGES_CACHE);
    const pageFallback = await pagesCache.match(baseUrl);
    if (pageFallback) return pageFallback;

    const indexFallback = await pagesCache.match('/');
    if (indexFallback) return indexFallback;

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  const cache = await caches.open(PAGES_CACHE);
  const cached = await cache.match(request);

  // Update cache in background if online
  if (navigator.onLine) {
    fetch(request, { redirect: 'follow' })
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
    fetch(request, { redirect: 'follow' })
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
