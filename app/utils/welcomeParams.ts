/**
 * Get all welcome page parameters from localStorage
 */
import colorOptions from '../data/colors.json';
import { Conciergerie, Employee } from '../types/types';
import { generateSimpleId } from './id';

/**
 * Type definition for the object returned by getWelcomeParams
 */
export interface WelcomeParams {
  userType: 'employee' | 'conciergerie' | null;
  employeeData: (Employee & { id: string }) | null;
  conciergerieData: (Conciergerie & { color?: string }) | null;
  userData: (Employee & { id: string }) | null;
}

// Get the color value from colors.json based on colorName
export const getColorValueByName = (colorName: string | undefined): string => {
  const colorOption = colorOptions.find(color => color.name === colorName);
  return colorOption?.value || 'var(--color-default)';
};

export function getWelcomeParams(): WelcomeParams {
  if (typeof window === 'undefined') {
    return {
      userType: null,
      employeeData: null,
      conciergerieData: null,
      userData: null,
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

    // Use employee data as user data if it exists
    const userData = employeeData;

    return {
      userType,
      employeeData,
      conciergerieData,
      userData,
    };
  } catch (error) {
    console.error('Error retrieving welcome params from localStorage:', error);
    return {
      userType: null,
      employeeData: null,
      conciergerieData: null,
      userData: null,
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

    if (userType === 'employee') {
      return (
        !!employeeData && !!employeeData.firstName && !!employeeData.familyName && !!employeeData.email && !!employeeData.tel
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
export function updateConciergerieData(data: Conciergerie): void {
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
 * Update employed data in localStorage
 */
export function updateEmployeeData(employee: Employee): void {
  try {
    // Get the current employee data
    const currentDataStr = localStorage.getItem('employee_data');
    const currentData = currentDataStr ? JSON.parse(currentDataStr) : null;
    employee.id ||= generateSimpleId(); // Generate employee id if it does not exist

    // If there's existing data, merge it with the new data
    const updatedData = currentData ? { ...currentData, ...employee } : employee;

    // Save the updated data
    localStorage.setItem('employee_data', JSON.stringify(updatedData));
  } catch (error) {
    console.error('Error updating employee data:', error);
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
