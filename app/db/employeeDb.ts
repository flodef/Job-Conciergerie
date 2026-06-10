import { sql } from '@/app/db/db';
import type { EmployeeStatus } from '@/app/types/dataTypes';
import { MAX_DEVICES } from '@/app/utils/id';
import type { EmployeeNotificationSettings } from '@/app/utils/notifications';
import { defaultEmployeeSettings } from '@/app/utils/notifications';

// Type definition for database employee
export interface DbEmployee {
  id: string[];
  first_name: string;
  family_name: string;
  tel: string;
  email: string;
  geographic_zone: string;
  message?: string;
  conciergerie_name?: string;
  notification_settings?: EmployeeNotificationSettings;
  status: EmployeeStatus;
  created_at: string;
}

/**
 * Format a database employee to match the application's expected format
 */
function formatEmployee(dbEmployee: DbEmployee) {
  return {
    id: dbEmployee.id,
    firstName: dbEmployee.first_name,
    familyName: dbEmployee.family_name,
    tel: dbEmployee.tel,
    email: dbEmployee.email,
    geographicZone: dbEmployee.geographic_zone,
    message: dbEmployee.message || '',
    conciergerieName: dbEmployee.conciergerie_name || '',
    status: dbEmployee.status,
    notificationSettings: dbEmployee.notification_settings || defaultEmployeeSettings,
    createdAt: dbEmployee.created_at,
  };
}

/**
 * Look up an employee by tel or email (unique identifiers).
 * Also returns whether the provided name matches, so the caller can detect conflicts.
 * Returns null if no employee with that tel/email exists.
 */
export const findEmployeeByContact = async (
  firstName: string,
  familyName: string,
  tel: string,
  email: string,
): Promise<{ employee: DbEmployee; nameMatches: boolean } | null> => {
  try {
    const result = await sql`
      SELECT id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status, created_at
      FROM employees
      WHERE tel = ${tel} OR email = ${email}
      LIMIT 1
    `;
    if (result.length === 0) return null;
    const employee = result[0] as DbEmployee;
    const nameMatches =
      employee.first_name.toLowerCase() === firstName.toLowerCase() &&
      employee.family_name.toLowerCase() === familyName.toLowerCase();
    return { employee, nameMatches };
  } catch (error) {
    console.error('Error finding employee by contact:', error);
    return null;
  }
};

/**
 * Fetch all employees with caching
 * Cache is invalidated when employee data changes
 */
export const getAllEmployees = async () => {
  try {
    const result = await sql`
        SELECT id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status, created_at
        FROM employees
        ORDER BY created_at DESC
      `;

    return result.map(row => formatEmployee(row as DbEmployee));
  } catch (error) {
    console.error('Error fetching employees:', error);
    return null;
  }
};

/**
 * Create a new employee
 * If employee already exists (unique constraint violation), return the existing employee
 */
export const createEmployee = async (data: Omit<DbEmployee, 'created_at'>) => {
  try {
    // Convert notification_settings to JSONB if present
    const notificationSettings = data.notification_settings ? JSON.stringify(data.notification_settings) : null;

    const result = await sql`
      INSERT INTO employees (
        id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status
      ) VALUES (
        ${data.id}, ${data.first_name}, ${data.family_name}, ${data.tel}, ${data.email}, ${data.geographic_zone},
        ${data.message || null}, ${data.conciergerie_name ?? null}, ${notificationSettings}::jsonb, ${data.status || 'pending'}
      )
      RETURNING id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status, created_at
    `;

    return result.length > 0 ? formatEmployee(result[0] as DbEmployee) : null;
  } catch (error: any) {
    // Check for unique constraint violation (PostgreSQL error code 23505)
    if (error?.code === '23505') {
      console.log('Employee already exists with this phone or email, fetching existing record');
      // Fetch and return the existing employee by phone or email
      const existing = await sql`
        SELECT id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status, created_at
        FROM employees
        WHERE tel = ${data.tel} OR email = ${data.email}
        LIMIT 1
      `;
      return existing.length > 0 ? formatEmployee(existing[0] as DbEmployee) : null;
    }
    console.error('Error creating employee:', error);
    return null;
  }
};

/**
 * Update an employee's status
 */
export const updateEmployeeStatus = async (firstName: string, familyName: string, status: EmployeeStatus) => {
  try {
    const result = await sql`
      UPDATE employees
      SET status = ${status}
      WHERE first_name = ${firstName} AND family_name = ${familyName}
      RETURNING id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status, created_at
    `;

    return result.length > 0 ? formatEmployee(result[0] as DbEmployee) : null;
  } catch (error) {
    console.error(`Error updating employee status for ${firstName} ${familyName}:`, error);
    return null;
  }
};

/**
 * Update an employee's settings
 */
export const updateEmployeeSettings = async (
  firstName: string | undefined,
  familyName: string | undefined,
  data: Partial<DbEmployee>,
) => {
  try {
    if (!firstName || !familyName) throw new Error('No employee name provided');

    // Convert notification_settings to JSONB if present
    const notificationSettings = data.notification_settings ? JSON.stringify(data.notification_settings) : null;

    const result = await sql`
      UPDATE employees
      SET 
        tel = COALESCE(${data.tel ?? null}, tel),
        email = COALESCE(${data.email ?? null}, email),
        geographic_zone = COALESCE(${data.geographic_zone ?? null}, geographic_zone),
        message = COALESCE(${data.message ?? null}, message),
        conciergerie_name = COALESCE(${data.conciergerie_name ?? null}, conciergerie_name),
        notification_settings = COALESCE(${notificationSettings}::jsonb, notification_settings)
      WHERE first_name = ${firstName} AND family_name = ${familyName}
      RETURNING id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status, created_at
    `;

    return result.length > 0 ? formatEmployee(result[0] as DbEmployee) : null;
  } catch (error) {
    console.error(`Error updating employee settings for ${firstName} ${familyName}:`, error);
    return null;
  }
};

/**
 * Delete an employee
 */
export const deleteEmployee = async (firstName: string, familyName: string) => {
  if (!firstName || !familyName) throw new Error('No employee name provided');
  try {
    const result = await sql`
      DELETE FROM employees
      WHERE first_name = ${firstName} AND family_name = ${familyName}
      RETURNING id
    `;

    return result.length > 0; // Check if deletion occurred by verifying if result has data
  } catch (error) {
    console.error(`Error deleting employee ${firstName} ${familyName}:`, error);
    return false;
  }
};

/**
 * Update an employee's ID array
 * @param employeeIds - Current array of employee IDs
 * @param firstName - Current employee first name
 * @param familyName - Current employee family name
 * @returns Updated array of employee IDs or null if error
 */
export const updateEmployeeId = async (
  firstName: string,
  familyName: string,
  employeeIds: string[],
): Promise<string[] | null> => {
  try {
    if (!firstName || !familyName) throw new Error('No employee name provided');

    const result = await sql`
      UPDATE employees
      SET id = ${employeeIds.slice(0, MAX_DEVICES)}::text[]
      WHERE first_name = ${firstName} AND family_name = ${familyName}
      RETURNING id
    `;

    return result.length > 0 ? result[0].id : null;
  } catch (error) {
    console.error(`Error updating employee ID array ${employeeIds}:`, error);
    return null;
  }
};
