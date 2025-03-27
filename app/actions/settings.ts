'use server';

import { getConciergerieById } from '@/app/db/conciergerieDb';
import { getEmployeeById } from '@/app/db/employeeDb';
import { ConciergerieNotificationSettings, EmployeeNotificationSettings } from '@/app/types/types';

/**
 * Fetch notification settings for a conciergerie by ID
 */
export async function fetchConciergerieSettings(id: string): Promise<ConciergerieNotificationSettings | null> {
  try {
    const conciergerie = await getConciergerieById(id);
    return conciergerie?.notificationSettings || null;
  } catch (error) {
    console.error(`Error fetching conciergerie settings by ID ${id}:`, error);
    return null;
  }
}

/**
 * Fetch notification settings for an employee by ID
 */
export async function fetchEmployeeSettings(id: string): Promise<EmployeeNotificationSettings | null> {
  try {
    const employee = await getEmployeeById(id);
    return employee?.notificationSettings || null;
  } catch (error) {
    console.error(`Error fetching employee settings by ID ${id}:`, error);
    return null;
  }
}
