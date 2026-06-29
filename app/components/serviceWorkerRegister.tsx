'use client';

import packageJson from '@/package.json';
import { useEffect, useRef } from 'react';
import { milliToMin } from '../utils/date';

const SW_CLEANUP_KEY = 'sw_cleanup_version';

export function ServiceWorkerRegister() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Only register service worker in production
    if (process.env.NODE_ENV === 'development') return;
    if (!('serviceWorker' in navigator) || typeof window === 'undefined') return;

    const registerSW = () =>
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration.scope);
          registrationRef.current = registration;

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is available, force activation
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });

    const cleanupAndRegister = () => {
      navigator.serviceWorker
        .getRegistrations()
        .then(registrations => Promise.all(registrations.map(r => r.unregister())))
        .then(() => localStorage.setItem(SW_CLEANUP_KEY, packageJson.version))
        .then(registerSW)
        .catch(error => {
          console.error('Service Worker cleanup failed:', error);
        });
    };

    if (localStorage.getItem(SW_CLEANUP_KEY) !== packageJson.version) {
      cleanupAndRegister();
    } else {
      registerSW();
    }

    // Periodically check for service worker updates (every 5 minutes)
    const intervalId = setInterval(() => {
      if (registrationRef.current) registrationRef.current.update();
    }, 5 * milliToMin);

    return () => clearInterval(intervalId);
  }, []);

  return null;
}
