'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { Conciergerie } from '@/app/types/types';
import { defaultPrimaryColor } from '@/app/utils/color';
import { createContext, ReactNode, useContext, useEffect } from 'react';

type ThemeContextType = {
  setPrimaryColor: (color: string | undefined) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { getUserData, userType } = useAuth();
  const conciergerieData = getUserData<Conciergerie>();

  const setPrimaryColor = (color: string | undefined) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-primary', color || defaultPrimaryColor);
    }
  };

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = async () => {
      setPrimaryColor(userType === 'conciergerie' ? conciergerieData?.color : undefined);
    };

    initializeTheme();
  }, [conciergerieData, userType]);

  return <ThemeContext.Provider value={{ setPrimaryColor }}>{children}</ThemeContext.Provider>;
}

// Hook to use the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
