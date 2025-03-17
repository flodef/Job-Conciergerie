'use server';

import { ConciergerieNotificationSettings, EmployeeNotificationSettings } from '@/app/types/types';
import { getConciergerieById, getEmployeeById } from '@/app/utils/db';

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
