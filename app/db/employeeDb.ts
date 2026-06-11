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
  } catch (error) {
    // Check for unique constraint violation (PostgreSQL error code 23505)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
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
 * Helper function to update missions when an employee is removed or rejected
 * - For single employee missions: set status to NULL
 * - For duo missions: set status to NULL only if both employees are NULL, otherwise keep 'accepted'
 * - For missions with status 'completed': keep employee_id intact
 */
const updateMissionsForEmployeeRemoval = async (firstName: string, familyName: string) => {
  try {
    // Fetch the employee to get their ID(s)
    const employeeResult = await sql`
      SELECT id
      FROM employees
      WHERE first_name = ${firstName} AND family_name = ${familyName}
      LIMIT 1
    `;

    if (employeeResult.length === 0) {
      console.warn(`Employee ${firstName} ${familyName} not found`);
      return;
    }

    const employeeIds = employeeResult[0].id as string[];

    // Update missions where this employee is assigned
    // For single employee missions (allow_duo = false): set status to NULL
    await sql`
      UPDATE missions
      SET status = NULL
      WHERE status IN ('accepted', 'started')
      AND allow_duo = false
      AND (employee_id = ANY(${employeeIds}) OR employee_id2 = ANY(${employeeIds}))
    `;

    // For duo missions: set status to NULL only if the other employee is also NULL
    // If employee_id is being removed, check if employee_id2 is NULL
    await sql`
      UPDATE missions
      SET status = NULL
      WHERE status IN ('accepted', 'started')
      AND allow_duo = true
      AND employee_id = ANY(${employeeIds})
      AND employee_id2 IS NULL
    `;

    // If employee_id2 is being removed, check if employee_id is NULL
    await sql`
      UPDATE missions
      SET status = NULL
      WHERE status IN ('accepted', 'started')
      AND allow_duo = true
      AND employee_id2 = ANY(${employeeIds})
      AND employee_id IS NULL
    `;
  } catch (error) {
    console.error(`Error updating missions for employee removal ${firstName} ${familyName}:`, error);
  }
};

/**
 * Update an employee's status
 * When setting status to 'rejected', update missions:
 * - For missions with status 'accepted' or 'started': set status to NULL
 * - For missions with status 'completed': keep employee_id intact
 */
export const updateEmployeeStatus = async (firstName: string, familyName: string, status: EmployeeStatus) => {
  try {
    // If rejecting, first update missions before changing status
    if (status === 'rejected') await updateMissionsForEmployeeRemoval(firstName, familyName);

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
 * Before deletion, update missions:
 * - For missions with status 'accepted' or 'started': set status to NULL
 * - For missions with status 'completed': keep employee_id intact
 */
export const deleteEmployee = async (firstName: string, familyName: string) => {
  if (!firstName || !familyName) throw new Error('No employee name provided');
  try {
    // First, update missions where this employee is assigned
    await updateMissionsForEmployeeRemoval(firstName, familyName);

    // Delete the employee
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
