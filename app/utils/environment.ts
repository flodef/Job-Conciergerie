'use client';

/**
 * Utility function to check if the application is in development mode.
 * Returns true if the app is running on localhost or if NEXT_PUBLIC_APP_URL is not set.
 */
export function isDevMode(): boolean {
  // Check if NEXT_PUBLIC_APP_URL is empty or not set (indicating development)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return true;

  // Check if we're on localhost
  return (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  );
}
