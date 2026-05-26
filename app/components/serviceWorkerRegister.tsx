'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Skip service worker in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Service Worker disabled in development');
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'imports',
        });

        console.log('Service Worker registered:', registration.scope);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New Service Worker available - skip waiting');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type === 'RELOAD') {
            window.location.reload();
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    // Wait for page to load before registering
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }, []);

  return null;
}
