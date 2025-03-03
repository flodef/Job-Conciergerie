'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { hasCompletedWelcomeFlow } from './welcomeParams';

/**
 * Hook to redirect users to the landing page if they haven't completed registration
 */
export function useRedirectIfNotRegistered() {
  const router = useRouter();

  useEffect(() => {
    // Check if the user has completed the welcome flow
    if (!hasCompletedWelcomeFlow()) {
      // Use window.location.href instead of router.replace to avoid navigation layout issues
      // This causes a full page reload which ensures the navigation layout is not shown
      window.location.href = '/';
    }
  }, [router]);
}
