'use server';

import { Conciergerie, Employee } from '../types/types';
import { getConciergerieById, getEmployeeById } from '../utils/db';

/**
 * Check if a user ID exists in either the conciergerie or employee tables
 * Returns the user type and ID if found, or null if not found
 */
export async function checkUserExists(id: string): Promise<{
  userType: 'conciergerie' | 'employee' | undefined;
  userData: Conciergerie | Employee | null;
}> {
  try {
    // Check if the user is an employee
    const employee = await getEmployeeById(id);
    if (employee) {
      return { userType: 'employee', userData: employee };
    }

    // Check if the user is a conciergerie
    const conciergerie = await getConciergerieById(id);
    if (conciergerie) {
      return { userType: 'conciergerie', userData: conciergerie };
    }

    // User not found
    return { userType: undefined, userData: null };
  } catch (error) {
    console.error(`Error checking user existence for ID ${id}:`, error);
    return { userType: undefined, userData: null };
  }
}
