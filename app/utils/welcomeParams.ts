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
  userType: 'employee' | 'conciergerie' | undefined;
  employeeData: (Employee & { id: string }) | undefined;
  conciergerieData: (Conciergerie & { color?: string }) | undefined;
  userData: (Employee & { id: string }) | undefined;
}

// Get the color value from colors.json based on colorName
export const getColorValueByName = (colorName: string | undefined): string => {
  const colorOption = colorOptions.find(color => color.name === colorName);
  return colorOption?.value || 'var(--color-default)';
};

export function getWelcomeParams(): WelcomeParams {
  if (typeof window === 'undefined') {
    return {
      userType: undefined,
      employeeData: undefined,
      conciergerieData: undefined,
      userData: undefined,
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
      userType: undefined,
      employeeData: undefined,
      conciergerieData: undefined,
      userData: undefined,
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
        !!employeeData &&
        !!employeeData.firstName &&
        !!employeeData.familyName &&
        !!employeeData.email &&
        !!employeeData.tel
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
 * Update employee data in localStorage
 * This updates both the employee_data and the employee in the employees_list
 */
export function updateEmployeeData(employee: Employee): void {
  try {
    // Get the current employee data
    const currentDataStr = localStorage.getItem('employee_data');
    const currentData = currentDataStr ? JSON.parse(currentDataStr) : null;
    employee.id ||= generateSimpleId(); // Generate employee id if it does not exist

    // If there's existing data, merge it with the new data
    const updatedData = currentData ? { ...currentData, ...employee } : employee;

    // Save the updated data to employee_data
    localStorage.setItem('employee_data', JSON.stringify(updatedData));

    // Also update the employee in the employees_list if it exists
    const employeesListStr = localStorage.getItem('employees_list');
    if (employeesListStr) {
      const employeesList = JSON.parse(employeesListStr);

      // Find the employee in the list by ID
      const employeeIndex = employeesList.findIndex((emp: Employee) => emp.id === employee.id);

      if (employeeIndex !== -1) {
        // Update the employee in the list
        const updatedEmployee = { ...employeesList[employeeIndex], ...employee };
        employeesList[employeeIndex] = updatedEmployee;

        // Save the updated list back to localStorage
        localStorage.setItem('employees_list', JSON.stringify(employeesList));
      }
    }
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
