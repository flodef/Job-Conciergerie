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
  runtimeCaching: [
    // Default Next.js caching
    ...defaultCache,

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
            maxAgeSeconds: 15 * 60, // 15 minutes max cache age
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
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days for images
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
