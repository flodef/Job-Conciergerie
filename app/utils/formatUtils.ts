/**
 * Formats points to display with minimal decimals
 * e.g., 3.0 becomes 3, and 1.666 becomes 1.7
 */
export const formatPoints = (points: number): string => {
  // If the number is an integer (no decimal part)
  if (Number.isInteger(points)) {
    return points.toString();
  }

  // Otherwise, round to 1 decimal place and remove trailing zeros
  return parseFloat(points.toFixed(1)).toString();
};
