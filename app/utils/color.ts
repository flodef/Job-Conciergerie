/**
 * Gets the default primary color from CSS variables
 * This is used for server-side rendering and as a fallback
 */
import colorOptions from '@/app/data/colors.json';

/**
 * Default primary color
 */
export const defaultPrimaryColor = 'var(--color-default)';

/**
 * Get the color value from colors.json based on colorName
 */
export const getColorValueByName = (colorName: string | undefined): string => {
  const colorOption = colorOptions.find(color => color.name === colorName);
  return colorOption?.value || defaultPrimaryColor;
};

export const setPrimaryColor = (color: string | undefined) => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--color-primary', color || defaultPrimaryColor);
  }
};
