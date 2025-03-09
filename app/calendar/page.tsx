'use client';

import { useEffect } from 'react';
import CalendarView from '../components/calendarView';
import { useTheme } from '../contexts/themeProvider';
import { useRedirectIfNotRegistered } from '../utils/redirectIfNotRegistered';
import { getWelcomeParams } from '../utils/welcomeParams';

export default function Calendar() {
  const { setPrimaryColor, resetPrimaryColor } = useTheme();
  
  // Redirect if not registered
  useRedirectIfNotRegistered();
  
  // Apply theme color on component mount
  useEffect(() => {
    const { employeeData, conciergerieData, userType } = getWelcomeParams();
    
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
  }, [setPrimaryColor, resetPrimaryColor]);
  
  return <CalendarView />;
}
