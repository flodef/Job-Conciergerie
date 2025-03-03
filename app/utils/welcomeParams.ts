/**
 * Get all welcome page parameters from localStorage
 */
import { ConciergerieData } from '../components/conciergerieForm';
import colorOptions from '../data/colors.json';

// Get the color value from colors.json based on colorName
export const getColorValueByName = (colorName: string): string | undefined => {
  const colorOption = colorOptions.find(color => color.name === colorName);
  return colorOption?.value;
};

export function getWelcomeParams() {
  if (typeof window === 'undefined') {
    return {
      userType: null,
      employeeData: null,
      conciergerieData: null,
    };
  }

  try {
    // Get user type
    const userTypeStr = localStorage.getItem('user_type');
    const userType = userTypeStr ? JSON.parse(userTypeStr) : null;

    // Get employee data if available
    const employeeDataStr = localStorage.getItem('employee_data');
    const employeeData = employeeDataStr ? JSON.parse(employeeDataStr) : null;

    // Get conciergerie data if available
    const conciergerieDataStr = localStorage.getItem('conciergerie_data');
    const conciergerieData = conciergerieDataStr ? JSON.parse(conciergerieDataStr) : null;

    // If we have conciergerie data, get the color value from colors.json
    if (conciergerieData && conciergerieData.colorName) {
      const colorValue = getColorValueByName(conciergerieData.colorName);
      if (colorValue) {
        conciergerieData.color = colorValue;
      }
    }

    return {
      userType,
      employeeData,
      conciergerieData,
    };
  } catch (error) {
    console.error('Error retrieving welcome params from localStorage:', error);
    return {
      userType: null,
      employeeData: null,
      conciergerieData: null,
    };
  }
}

/**
 * Check if user has completed the welcome flow
 */
export function hasCompletedWelcomeFlow(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const { userType, employeeData, conciergerieData } = getWelcomeParams();

    // User has completed welcome flow if:
    // 1. They've selected a user type AND
    // 2a. If they're a prestataire, they've filled out employee data OR
    // 2b. If they're a conciergerie, they've selected a conciergerie name

    if (!userType) return false;

    if (userType === 'prestataire') {
      return (
        !!employeeData && !!employeeData.nom && !!employeeData.prenom && !!employeeData.email && !!employeeData.tel
      );
    }

    if (userType === 'conciergerie') {
      return !!conciergerieData && !!conciergerieData.name;
    }

    return false;
  } catch (error) {
    console.error('Error checking welcome flow completion:', error);
    return false;
  }
}

/**
 * Update conciergerie data in localStorage
 */
export function updateConciergerieData(data: ConciergerieData): void {
  if (typeof window === 'undefined') return;

  try {
    // Get the color value from colors.json if colorName is provided
    const updatedData = { ...data };
    if (updatedData.colorName) {
      const colorValue = getColorValueByName(updatedData.colorName);
      if (colorValue) {
        updatedData.color = colorValue;
      }
    }

    localStorage.setItem('conciergerie_data', JSON.stringify(updatedData));
  } catch (error) {
    console.error('Error updating conciergerie data in localStorage:', error);
  }
}

/**
 * Clear all welcome page parameters from localStorage
 */
export function clearWelcomeParams(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('user_type');
    localStorage.removeItem('employee_data');
    localStorage.removeItem('conciergerie_data');
  } catch (error) {
    console.error('Error clearing welcome params from localStorage:', error);
  }
}
