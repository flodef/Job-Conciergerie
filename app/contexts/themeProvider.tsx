'use client';

import { createContext, ReactNode, useContext, useEffect } from 'react';
import { getWelcomeParams, getColorValueByName } from '../utils/welcomeParams';

export const defaultPrimaryColor = '#a4bcde';

type ThemeContextType = {
  setPrimaryColor: (color: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
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
      // If no color but has colorName, get the color from colors.json
      else if (conciergerieData && conciergerieData.colorName) {
        const colorValue = getColorValueByName(conciergerieData.colorName);
        if (colorValue) {
          setPrimaryColor(colorValue);
        }
      }
    };

    initializeTheme();
  }, []);

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
