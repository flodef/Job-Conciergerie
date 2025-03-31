/**
 * Utility to determine if a dropdown should open upward based on available space
 * This accounts for both window boundaries and scrollable parent containers (like modals)
 */

interface PositionCheckParams {
  elementRef: HTMLElement;
  itemCount: number;
  itemHeight?: number;
  maxHeight?: number;
  padding?: number;
}

/**
 * Generate an array of numbers from start to end with a given step
 * @param start The starting number
 * @param end The ending number
 * @param step The step size (default: 1)
 * @returns An array of numbers from start to end with the given step
 */
export function range(start: number, end: number, step = 1): number[] {
  if (step === 0) step = start <= end ? 1 : -1; // Avoid infinite loop
  return Array.from({ length: (end - start) / step + 1 }, (_, i) => start + i * step);
}

/**
 * Determine if a dropdown should open upward based on available space
 * This accounts for both window boundaries and scrollable parent containers (like modals)
 * @param params Configuration object for dropdown position check
 * @returns True if the dropdown should open upward, false otherwise
 */
export function shouldOpenUpward({
  elementRef,
  itemCount,
  itemHeight = 40, // Default height per item
  maxHeight = 202, // Default max dropdown height
  padding = 4, // Default padding
}: PositionCheckParams): boolean {
  if (!elementRef) return false;

  const rect = elementRef.getBoundingClientRect();

  // Find the closest scrollable parent (likely a modal)
  let parentContainer = elementRef.parentElement;
  let scrollableParent = null;

  // Look for a scrollable parent container
  while (parentContainer) {
    const overflowY = window.getComputedStyle(parentContainer).overflowY;
    if (['auto', 'scroll', 'overlay'].includes(overflowY)) {
      scrollableParent = parentContainer;
      break;
    }
    parentContainer = parentContainer.parentElement;
  }

  // Calculate bottom space based on parent container or fallback to window
  let bottomSpace;
  if (scrollableParent) {
    const parentRect = scrollableParent.getBoundingClientRect();
    bottomSpace = parentRect.bottom - rect.bottom;
  } else {
    bottomSpace = window.innerHeight - rect.bottom;
  }

  // Calculate dropdown height based on item count with max height limit
  const dropdownHeight = Math.min(itemCount * itemHeight, maxHeight);

  // Return true if there's not enough space below
  return bottomSpace < dropdownHeight + padding;
}
