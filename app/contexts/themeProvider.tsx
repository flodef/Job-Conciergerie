'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getWelcomeParams } from '../utils/welcomeParams';

type ThemeContextType = {
  setPrimaryColor: (color: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Function to set the primary color
  const setPrimaryColor = (color: string) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-primary', color);
    }
  };

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const initializeTheme = async () => {
      // Add a small delay to ensure localStorage is properly loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { conciergerieData } = getWelcomeParams();
      
      // If conciergerie data exists and has a color, set it as primary
      if (conciergerieData && conciergerieData.color) {
        setPrimaryColor(conciergerieData.color);
      }
    };
    
    initializeTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
