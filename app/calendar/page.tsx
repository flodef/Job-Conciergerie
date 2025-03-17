'use client';

import { useEffect } from 'react';
import CalendarView from '../components/calendarView';
import LoadingSpinner from '../components/loadingSpinner';
import { useAuth } from '../contexts/authProvider';
import { useTheme } from '../contexts/themeProvider';
import { useRedirectIfNotRegistered } from '../utils/authRedirect';

export default function Calendar() {
  const { setPrimaryColor, resetPrimaryColor } = useTheme();
  const { userType, conciergerieData, employeeData, isLoading: authLoading } = useAuth();

  // Redirect if not registered - must be called before any conditional returns
  useRedirectIfNotRegistered();

  // Apply theme color on component mount - must be called before any conditional returns
  useEffect(() => {
    // Skip if still loading
    if (authLoading || !userType) return;

    // Using data directly from auth context instead of localStorage
    if (userType === 'employee' && employeeData?.conciergerieName) {
      // For employees, use the color of their conciergerie
      if (conciergerieData && conciergerieData.color) {
        setPrimaryColor(conciergerieData.color);
      } else {
        resetPrimaryColor();
      }
    } else if (userType === 'conciergerie') {
      // For conciergeries, use their own color
      if (conciergerieData && conciergerieData.color) {
        setPrimaryColor(conciergerieData.color);
      } else {
        resetPrimaryColor();
      }
    } else {
      resetPrimaryColor();
    }
  }, [setPrimaryColor, resetPrimaryColor, userType, conciergerieData, employeeData, authLoading]);

  // Prevent rendering anything until authentication is complete
  // This prevents the brief flash of the calendar page before redirect
  if (authLoading || !userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Vérification de l'authentification..." />
      </div>
    );
  }

  return <CalendarView />;
}
