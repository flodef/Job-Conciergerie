'use client';

import { useEffect } from 'react';
import { useAuth } from '../contexts/authProvider';

/**
 * Hook to redirect users based on their authentication status
 * @param options Configuration options for the redirect
 */
export function useAuthRedirect(options: {
  requireAuth?: boolean;
  redirectIfAuthenticated?: boolean;
  redirectPath?: string;
  allowedUserTypes?: ('conciergerie' | 'employee')[];
}) {
  const {
    requireAuth = false,
    redirectIfAuthenticated = false,
    redirectPath = '/',
    allowedUserTypes = ['conciergerie', 'employee'],
  } = options;

  const { userType, isLoading } = useAuth();

  useEffect(() => {
    // Get the current path
    const currentPath = window.location.pathname;

    // Skip redirect if still loading
    if (isLoading) return;

    // Skip redirect if already on the target path
    if (currentPath === redirectPath) return;

    // Redirect if authentication is required but user is not authenticated
    if (requireAuth && !userType) {
      window.location.href = redirectPath;
      return;
    }

    // Redirect if user is authenticated but shouldn't be on this page
    if (redirectIfAuthenticated && userType) {
      window.location.href = redirectPath;
      return;
    }

    // Redirect if user is of the wrong type
    if (requireAuth && userType && allowedUserTypes.length > 0 && !allowedUserTypes.includes(userType)) {
      window.location.href = redirectPath;
      return;
    }
  }, [isLoading, userType, requireAuth, redirectIfAuthenticated, redirectPath, allowedUserTypes]);
}

/**
 * Hook to redirect users if they are not registered
 * This is a replacement for the existing useRedirectIfNotRegistered hook
 */
export function useRedirectIfNotRegistered() {
  return useAuthRedirect({
    requireAuth: true,
    redirectPath: '/',
  });
}

/**
 * Hook to redirect users if they are already registered
 */
export function useRedirectIfRegistered() {
  const { userType, conciergerieData, employeeData, isLoading } = useAuth();
  
  useEffect(() => {
    // Skip redirect if still loading
    if (isLoading) return;
    
    // Only redirect if the user has a valid type AND their data exists in the database
    const isRegistered = userType && (
      (userType === 'conciergerie' && conciergerieData) || 
      (userType === 'employee' && employeeData)
    );
    
    if (isRegistered) {
      window.location.href = '/missions';
    }
  }, [isLoading, userType, conciergerieData, employeeData]);
}
