'use client';

import { checkUserExists } from '@/app/actions/auth';
import { fetchEmployeeById } from '@/app/actions/employee';
import { useAuth } from '@/app/contexts/authProvider';
import { useEffect, useRef } from 'react';

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
  const { userId, userType, isLoading } = useAuth();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Store whether we've already checked to prevent infinite loops
    if (hasCheckedRef.current) return;

    const checkUserStatus = async () => {
      // Skip if still loading or no userId
      if (isLoading || !userId) return;

      try {
        // Mark that we've checked to prevent infinite loops
        hasCheckedRef.current = true;

        // Check if user exists in the database
        const { userType: foundUserType } = await checkUserExists(userId);

        // If user doesn't exist in the database, redirect to home
        if (!foundUserType) {
          window.location.href = '/';
          return;
        }

        // If user is an employee, check their status
        if (foundUserType === 'employee') {
          const employee = await fetchEmployeeById(userId);

          if (employee) {
            // If employee is not accepted, redirect to waiting page
            if (employee.status !== 'accepted') {
              window.location.href = '/waiting';
              return;
            }
          } else {
            // Employee not found, redirect to home
            window.location.href = '/';
            return;
          }
        }
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    };

    checkUserStatus();
  }, [userId, userType, isLoading]);
}

/**
 * Hook to redirect users if they are not pending or rejected employees
 * This ensures only the right users can access the waiting page
 */
export function useRedirectIfNotPending() {
  const { userId, userType, isLoading } = useAuth();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Store whether we've already checked to prevent infinite loops
    if (hasCheckedRef.current) return;

    const checkUserStatus = async () => {
      // Skip if still loading or no userId
      if (isLoading || !userId) return;

      try {
        // Mark that we've checked to prevent infinite loops
        hasCheckedRef.current = true;

        // Check if user exists in the database
        const { userType: foundUserType } = await checkUserExists(userId);

        // If user doesn't exist in the database, redirect to home
        if (!foundUserType) {
          window.location.href = '/';
          return;
        }

        // If user is a conciergerie, they can stay on the waiting page
        if (foundUserType === 'conciergerie') {
          return;
        }

        // If user is an employee, check their status
        if (foundUserType === 'employee') {
          const employee = await fetchEmployeeById(userId);

          if (employee) {
            // If employee is accepted, redirect to missions
            if (employee.status === 'accepted') {
              window.location.href = '/missions';
              return;
            }

            // If employee is pending or rejected, they can stay on the waiting page
            return;
          } else {
            // Employee not found, redirect to home
            window.location.href = '/';
            return;
          }
        }
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    };

    checkUserStatus();
  }, [userId, userType, isLoading]);
}

/**
 * Hook to redirect users if they are already registered
 */
export function useRedirectIfRegistered() {
  const { userId, userType, isLoading } = useAuth();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Store whether we've already checked to prevent infinite loops
    if (hasCheckedRef.current) return;

    const checkUserStatus = async () => {
      // Skip if still loading or no userId
      if (isLoading || !userId) return;

      try {
        // Mark that we've checked to prevent infinite loops
        hasCheckedRef.current = true;

        // Check if user exists in the database
        const { userType: foundUserType } = await checkUserExists(userId);

        if (foundUserType === 'employee') {
          // If user is an employee, check their status
          const employee = await fetchEmployeeById(userId);

          if (employee) {
            // Redirect based on employee status
            if (employee.status === 'accepted') {
              window.location.href = '/missions';
              return; // Exit early to prevent further execution
            } else {
              // For pending or rejected employees
              window.location.href = '/waiting';
              return; // Exit early to prevent further execution
            }
          }
        } else if (foundUserType === 'conciergerie') {
          // If user is a conciergerie, redirect to missions
          window.location.href = '/missions';
          return; // Exit early to prevent further execution
        }
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    };

    checkUserStatus();
  }, [userId, userType, isLoading]);
}
