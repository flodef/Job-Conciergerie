'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { hasCompletedWelcomeFlow, getWelcomeParams } from './welcomeParams';
import { getEmployees } from './employeeUtils';

/**
 * Hook to redirect users to the landing page if they haven't completed registration
 * or to the waiting page if they have a pending application
 */
export function useRedirectIfNotRegistered() {
  const router = useRouter();

  useEffect(() => {
    // Get the current path
    const currentPath = window.location.pathname;
    
    // Don't redirect if already on the waiting page
    if (currentPath === '/waiting') {
      return;
    }
    
    // Get user type from localStorage
    const { userType, employeeData } = getWelcomeParams();
    
    // If user type is conciergerie, allow access (don't redirect)
    if (userType === 'conciergerie') {
      return;
    }
    
    // Check if employee data exists in localStorage
    if (employeeData && userType === 'employee') {
      try {
        // Get all employees
        const allEmployees = getEmployees();
        
        // Find employee with matching email
        const foundEmployee = allEmployees.find(
          emp => emp.email.toLowerCase() === employeeData.email.toLowerCase()
        );
        
        if (foundEmployee) {
          // If employee is pending or rejected, redirect to waiting page
          if (foundEmployee.status === 'pending' || foundEmployee.status === 'rejected') {
            window.location.href = '/waiting';
            return;
          }
          
          // If employee is accepted, allow access
          if (foundEmployee.status === 'accepted') {
            return;
          }
        }
      } catch (error) {
        console.error('Error checking employee status:', error);
      }
    }
    
    // Check if the user has completed the welcome flow
    // Only redirect to home if not on the waiting page and no valid employee data
    if (!hasCompletedWelcomeFlow()) {
      window.location.href = '/';
    }
  }, [router]);
}
