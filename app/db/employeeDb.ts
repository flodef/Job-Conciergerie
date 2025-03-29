import { sql } from '@/app/db/db';
import { EmployeeNotificationSettings, EmployeeStatus } from '@/app/types/dataTypes';
import { defaultEmployeeSettings } from '@/app/utils/notifications';

// Type definition for database employee
export interface DbEmployee {
  id: string;
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
 * Fetch all employees with caching
 * Cache is invalidated when employee data changes
 */
export const getAllEmployees = async () => {
  try {
    const result = await sql`
        SELECT id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status, created_at
        FROM employee
        ORDER BY created_at DESC
      `;

    return result.map(row => formatEmployee(row as DbEmployee));
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
};

/**
 * Check if an employee already exists with the same name, phone, or email
 */
export const employeeExists = async (
  firstName: string,
  familyName: string,
  tel: string,
  email: string,
): Promise<boolean> => {
  try {
    const result = await sql`
      SELECT id FROM employee
      WHERE 
        (LOWER(first_name) = LOWER(${firstName}) AND LOWER(family_name) = LOWER(${familyName}))
        OR tel = ${tel}
        OR LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    return result.length > 0;
  } catch (error) {
    console.error('Error checking if employee exists:', error);
    return false;
  }
};

/**
 * Create a new employee
 */
export const createEmployee = async (data: Omit<DbEmployee, 'created_at'>) => {
  try {
    // Convert notification_settings to JSONB if present
    const notificationSettings = data.notification_settings ? JSON.stringify(data.notification_settings) : null;

    const result = await sql`
      INSERT INTO employee (
        id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status
      ) VALUES (
        ${data.id}, ${data.first_name}, ${data.family_name}, ${data.tel}, ${data.email}, ${data.geographic_zone},
        ${data.message || null}, ${data.conciergerie_name}, ${notificationSettings}::jsonb, ${data.status || 'pending'}
      )
      RETURNING id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status, created_at
    `;

    return result.length > 0 ? formatEmployee(result[0] as DbEmployee) : null;
  } catch (error) {
    console.error('Error creating employee:', error);
    return null;
  }
};

/**
 * Update an employee's status
 */
export const updateEmployeeStatus = async (id: string | undefined, status: EmployeeStatus) => {
  try {
    if (!id) throw new Error('No ID provided');
    const result = await sql`
      UPDATE employee
      SET status = ${status}, message = null, conciergerie_name = null
      WHERE id = ${id}
      RETURNING id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status, created_at
    `;

    return result.length > 0 ? formatEmployee(result[0] as DbEmployee) : null;
  } catch (error) {
    console.error(`Error updating employee status for ID ${id}:`, error);
    return null;
  }
};

/**
 * Update an employee's settings
 */
export const updateEmployeeSettings = async (id: string | undefined, data: Partial<DbEmployee>) => {
  try {
    if (!id) throw new Error('No ID provided');
    // Convert notification_settings to JSONB if present
    const notificationSettings = data.notification_settings ? JSON.stringify(data.notification_settings) : null;

    const result = await sql`
      UPDATE employee
      SET 
        tel = COALESCE(${data.tel}, tel),
        email = COALESCE(${data.email}, email),
        geographic_zone = COALESCE(${data.geographic_zone}, geographic_zone),
        message = COALESCE(${data.message}, message),
        conciergerie_name = COALESCE(${data.conciergerie_name}, conciergerie_name),
        notification_settings = COALESCE(${notificationSettings}::jsonb, notification_settings)
      WHERE id = ${id}
      RETURNING id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, notification_settings, status, created_at
    `;

    return result.length > 0 ? formatEmployee(result[0] as DbEmployee) : null;
  } catch (error) {
    console.error(`Error updating employee settings for ID ${id}:`, error);
    return null;
  }
};
