/**
 * Gets the value of a CSS variable from the :root element
 * Falls back to a default value if the variable is not found or if running on the server
 */
export function getCssVariable(variableName: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();

  return value || fallback;
}

/**
 * Gets the default primary color from CSS variables
 * This is used for server-side rendering and as a fallback
 */
export function getDefaultPrimaryColor(): string {
  // The value from globals.css
  return 'oklch(0.704 0.14 182.503)';
}
