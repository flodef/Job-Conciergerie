/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, StaleWhileRevalidate, CacheFirst } from 'serwist';
import { ExpirationPlugin, CacheableResponsePlugin } from 'serwist';

// Declare Serwist types
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Enable offline fallback for navigation
  fallbacks: {
    entries: [
      {
        url: '/',
        matcher({ request }) {
          return request.mode === 'navigate';
        },
      },
    ],
  },
  runtimeCaching: [
    // Default Next.js caching
    ...defaultCache,

    // Cache page navigation requests - Network first with cache fallback for offline
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new StaleWhileRevalidate({
        cacheName: 'pages-cache',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },

    // Stale-while-revalidate for API calls (missions/homes data)
    {
      matcher: ({ url }) => {
        // Cache Supabase API calls and your app API routes
        return url.pathname.includes('/rest/v1/') || url.pathname.startsWith('/api/');
      },
      handler: new StaleWhileRevalidate({
        cacheName: 'api-data-cache',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60, // 1 hour max cache age
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },

    // Cache images from Supabase storage
    {
      matcher: ({ url }) => {
        return url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/');
      },
      handler: new CacheFirst({
        cacheName: 'supabase-images',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days for images
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },

    // Cache Next.js RSC (React Server Component) requests for offline navigation
    {
      matcher: ({ url }) => {
        // Match RSC payload requests (_rsc query param)
        return url.searchParams.has('_rsc');
      },
      handler: new StaleWhileRevalidate({
        cacheName: 'rsc-cache',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
