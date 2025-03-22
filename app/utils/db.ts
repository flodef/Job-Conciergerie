import { UserType } from '@/app/contexts/authProvider';
import { ConciergerieNotificationSettings, EmployeeNotificationSettings, EmployeeStatus } from '@/app/types/types';
import { getColorValueByName } from '@/app/utils/color';
import { neon } from '@neondatabase/serverless';
import { unstable_cache } from 'next/cache';

// Type definition for database conciergerie
export interface DbConciergerie {
  id: string;
  name: string;
  email: string;
  tel: string;
  color_name: string;
  notification_settings?: ConciergerieNotificationSettings;
}

// Type definition for database employee
export interface DbEmployee {
  id: string;
  first_name: string;
  family_name: string;
  tel: string;
  email: string;
  message?: string;
  conciergerie_name?: string;
  notification_settings?: EmployeeNotificationSettings;
  status: EmployeeStatus;
  created_at: string;
}

// Initialize neon client
const sql = neon(process.env.DATABASE_URL as string);

// Cache time: 1 hour in seconds
const CACHE_TIME = 60 * 60;

/**
 * Check if a user exists and what type they are
 */
export async function getExistingUserType(userId: string): Promise<UserType> {
  try {
    const result = await sql`
      SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM conciergerie WHERE id = ${userId}) THEN 'conciergerie'
        WHEN EXISTS (SELECT 1 FROM employee WHERE id = ${userId} AND status = 'accepted') THEN 'employee'
        ELSE NULL
      END AS result
    `;

    return result[0].result ? (result[0].result as UserType) : undefined;
  } catch (error) {
    console.error('Error checking user status:', error);
    return undefined;
  }
}

/**
 * Format a database conciergerie to match the application's expected format
 */
function formatConciergerie(dbConciergerie: DbConciergerie) {
  return {
    id: dbConciergerie.id,
    name: dbConciergerie.name,
    email: dbConciergerie.email,
    tel: dbConciergerie.tel,
    colorName: dbConciergerie.color_name,
    color: getColorValueByName(dbConciergerie.color_name),
    notificationSettings: dbConciergerie.notification_settings || {
      acceptedMissions: true,
      startedMissions: true,
      completedMissions: true,
      missionsEndedWithoutStart: true,
    },
  };
}

/**
 * Fetch all conciergeries with caching
 * Cache is invalidated when accessing the settings page
 */
export const getAllConciergeries = async () => {
  try {
    const result = await sql`
        SELECT id, name, email, tel, color_name, notification_settings
        FROM conciergerie
      `;

    return result.map(row => formatConciergerie(row as unknown as DbConciergerie));
  } catch (error) {
    console.error('Error fetching conciergeries:', error);
    return [];
  }
};

/**
 * Get a single conciergerie by ID
 */
export const getConciergerieById = unstable_cache(
  async (id?: string) => {
    try {
      if (!id) throw new Error('No ID provided');
      const result = await sql`
        SELECT id, name, email, tel, color_name, notification_settings
        FROM conciergerie
        WHERE id = ${id}
      `;

      return result.length > 0 ? formatConciergerie(result[0] as unknown as DbConciergerie) : null;
    } catch (error) {
      console.error(`Error fetching conciergerie with ID ${id}:`, error);
      return null;
    }
  },
  ['conciergerie'],
  { revalidate: CACHE_TIME },
);

/**
 * Create a new conciergerie
 */
export const createConciergerie = async (data: Omit<DbConciergerie, 'id'>) => {
  try {
    // Convert notification_settings to JSONB if present
    const notificationSettings = data.notification_settings ? JSON.stringify(data.notification_settings) : null;

    const result = await sql`
      INSERT INTO conciergerie (
        name, email, tel, color_name, notification_settings
      ) VALUES (
        ${data.name}, ${data.email}, ${data.tel}, ${data.color_name}, ${notificationSettings}::jsonb
      )
      RETURNING id, name, email, tel, color_name, notification_settings
    `;

    return result.length > 0 ? formatConciergerie(result[0] as unknown as DbConciergerie) : null;
  } catch (error) {
    console.error('Error creating conciergerie:', error);
    return null;
  }
};

/**
 * Update a conciergerie's data
 */
export const updateConciergerie = async (id: string | undefined, data: Partial<DbConciergerie>) => {
  try {
    if (!id) throw new Error('No ID provided');

    // Convert notification_settings to JSONB if present
    const notificationSettings = data.notification_settings ? JSON.stringify(data.notification_settings) : null;

    const result = await sql`
      UPDATE conciergerie
      SET 
        name = COALESCE(${data.name}, name),
        email = COALESCE(${data.email}, email),
        tel = COALESCE(${data.tel}, tel),
        color_name = COALESCE(${data.color_name}, color_name),
        notification_settings = COALESCE(${notificationSettings}::jsonb, notification_settings)
      WHERE id = ${id}
      RETURNING id, name, email, tel, color_name, notification_settings
    `;

    return result.length > 0 ? formatConciergerie(result[0] as unknown as DbConciergerie) : null;
  } catch (error) {
    console.error(`Error updating conciergerie with ID ${id}:`, error);
    return null;
  }
};

/**
 * Update a conciergerie's ID
 */
export const updateConciergerieId = async (conciergerieName: string, id: string) => {
  try {
    if (!conciergerieName) throw new Error('No conciergerie name provided');
    if (!id) throw new Error('No ID provided');

    const result = await sql`
      UPDATE conciergerie
      SET id = ${id}
      WHERE name = ${conciergerieName}
    `;

    return result.length > 0;
  } catch (error) {
    console.error(`Error updating conciergerie with name ${conciergerieName}:`, error);
    return false;
  }
};

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
    message: dbEmployee.message || '',
    conciergerieName: dbEmployee.conciergerie_name || '',
    status: dbEmployee.status,
    notificationSettings: dbEmployee.notification_settings || {
      acceptedMissions: true,
      missionChanged: true,
      missionDeleted: true,
      missionsCanceled: true,
    },
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
        SELECT id, first_name, family_name, tel, email, message, conciergerie_name, notification_settings, status, created_at
        FROM employee
        ORDER BY created_at DESC
      `;

    return result.map(row => formatEmployee(row as unknown as DbEmployee));
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
};

/**
 * Get a single employee by ID
 */
export const getEmployeeById = async (id?: string) => {
  try {
    if (!id) throw new Error('No ID provided');
    const result = await sql`
      SELECT id, first_name, family_name, tel, email, message, conciergerie_name, notification_settings, status, created_at
      FROM employee
      WHERE id = ${id}
    `;

    return result.length > 0 ? formatEmployee(result[0] as unknown as DbEmployee) : null;
  } catch (error) {
    console.error(`Error fetching employee with ID ${id}:`, error);
    return null;
  }
};

/**
 * Get employees by conciergerie name
 */
export const getEmployeesByConciergerie = unstable_cache(
  async (conciergerieName: string) => {
    try {
      const result = await sql`
        SELECT id, first_name, family_name, tel, email, message, conciergerie_name, notification_settings, status, created_at
        FROM employee
        WHERE conciergerie_name = ${conciergerieName}
        ORDER BY created_at DESC
      `;

      return result.map(row => formatEmployee(row as unknown as DbEmployee));
    } catch (error) {
      console.error(`Error fetching employees for conciergerie ${conciergerieName}:`, error);
      return [];
    }
  },
  ['employees_by_conciergerie'],
  { revalidate: CACHE_TIME },
);

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
        id, first_name, family_name, tel, email, message, conciergerie_name, notification_settings, status
      ) VALUES (
        ${data.id}, ${data.first_name}, ${data.family_name}, ${data.tel}, ${data.email}, 
        ${data.message || null}, ${data.conciergerie_name || null}, ${notificationSettings}::jsonb, ${
      data.status || 'pending'
    }
      )
      RETURNING id, first_name, family_name, tel, email, message, conciergerie_name, notification_settings, status, created_at
    `;

    return result.length > 0 ? formatEmployee(result[0] as unknown as DbEmployee) : null;
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
      SET status = ${status}
      WHERE id = ${id}
      RETURNING id, first_name, family_name, tel, email, message, conciergerie_name, notification_settings, status, created_at
    `;

    return result.length > 0 ? formatEmployee(result[0] as unknown as DbEmployee) : null;
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
        message = COALESCE(${data.message}, message),
        conciergerie_name = COALESCE(${data.conciergerie_name}, conciergerie_name),
        notification_settings = COALESCE(${notificationSettings}::jsonb, notification_settings)
      WHERE id = ${id}
      RETURNING id, first_name, family_name, tel, email, message, conciergerie_name, notification_settings, status, created_at
    `;

    return result.length > 0 ? formatEmployee(result[0] as unknown as DbEmployee) : null;
  } catch (error) {
    console.error(`Error updating employee settings for ID ${id}:`, error);
    return null;
  }
};
