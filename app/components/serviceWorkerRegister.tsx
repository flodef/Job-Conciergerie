'use client';

import packageJson from '@/package.json';
import { useEffect } from 'react';

const SW_CLEANUP_KEY = 'sw_cleanup_version';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Only register service worker in production
    if (process.env.NODE_ENV === 'development') return;

    if (!('serviceWorker' in navigator)) return;

    const registerSW = () =>
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });

    if (localStorage.getItem(SW_CLEANUP_KEY) !== packageJson.version) {
      navigator.serviceWorker
        .getRegistrations()
        .then(registrations => Promise.all(registrations.map(r => r.unregister())))
        .then(() => localStorage.setItem(SW_CLEANUP_KEY, packageJson.version))
        .then(registerSW)
        .catch(error => {
          console.error('Service Worker cleanup failed:', error);
        });
    } else {
      registerSW();
    }
  }, []);

  return null;
}
