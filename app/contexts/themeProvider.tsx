'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { getCssVariable, getDefaultPrimaryColor } from '../utils/cssVariables';
import { getColorValueByName, getWelcomeParams } from '../utils/welcomeParams';

type ThemeContextType = {
  setPrimaryColor: (color: string) => void;
  resetPrimaryColor: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Get the default color from our utility function
  const [defaultPrimaryColor, setDefaultPrimaryColor] = useState(getDefaultPrimaryColor());

  const setPrimaryColor = (color: string) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-primary', color);
    }
  };

  const resetPrimaryColor = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--color-primary', defaultPrimaryColor);
    }
  };

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const initializeTheme = async () => {
      // Add a small delay to ensure localStorage is properly loaded
      await new Promise(resolve => setTimeout(resolve, 100));

      const { conciergerieData, userType } = getWelcomeParams();

      if (userType === 'conciergerie') {
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
      } else {
        setPrimaryColor(defaultPrimaryColor);
      }
    };

    initializeTheme();

    // Also try to get the CSS variable value at runtime
    if (typeof window !== 'undefined') {
      const cssDefaultColor = getCssVariable('--color-default', defaultPrimaryColor);
      setDefaultPrimaryColor(cssDefaultColor);
    }
  }, [defaultPrimaryColor]);

  return <ThemeContext.Provider value={{ setPrimaryColor, resetPrimaryColor }}>{children}</ThemeContext.Provider>;
}

// Hook to use the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
