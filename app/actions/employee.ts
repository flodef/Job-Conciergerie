'use server';

import {
  DbEmployee,
  createEmployee,
  deleteEmployee,
  getAllEmployees,
  updateEmployeeSettings,
  updateEmployeeStatus,
} from '@/app/db/employeeDb';
import { Employee, EmployeeStatus } from '@/app/types/dataTypes';
import { EmployeeNotificationSettings } from '@/app/utils/notifications';

/**
 * Fetch all employees from the database with caching
 * Cache is refreshed every hour or when explicitly revalidated
 */
export async function fetchEmployees(): Promise<Employee[] | null> {
  return await getAllEmployees();
}

/**
 * Create a new employee in the database
 */
export async function createNewEmployee(data: {
  id: string;
  firstName: string;
  familyName: string;
  tel: string;
  email: string;
  geographicZone: string;
  message?: string;
  conciergerieName?: string;
  notificationSettings?: EmployeeNotificationSettings;
}): Promise<Employee | null> {
  // Convert to DB format
  const dbData: Omit<DbEmployee, 'created_at'> = {
    id: [data.id],
    first_name: data.firstName,
    family_name: data.familyName,
    tel: data.tel,
    email: data.email,
    geographic_zone: data.geographicZone,
    message: data.message,
    conciergerie_name: data.conciergerieName,
    notification_settings: data.notificationSettings,
    status: 'pending',
  };

  return await createEmployee(dbData);
}

/**
 * Update an employee's status in the database
 */
export async function updateEmployeeStatusAction(employee: Employee, status: EmployeeStatus): Promise<Employee | null> {
  return await updateEmployeeStatus(employee.firstName, employee.familyName, status);
}

/**
 * Update an employee's settings in the database
 */
export async function updateEmployeeData(
  employee: Employee | undefined,
  data: {
    tel?: string;
    email?: string;
    geographicZone?: string;
    message?: string;
    conciergerieName?: string;
    notificationSettings?: EmployeeNotificationSettings;
  },
): Promise<Employee | null> {
  // Convert to DB format
  const dbData: Partial<DbEmployee> = {
    tel: data.tel,
    email: data.email,
    geographic_zone: data.geographicZone,
    message: data.message,
    conciergerie_name: data.conciergerieName,
    notification_settings: data.notificationSettings,
  };

  return await updateEmployeeSettings(employee?.firstName, employee?.familyName, dbData);
}

/**
 * Delete an employee
 */
export async function deleteEmployeeData(employee: Employee): Promise<boolean> {
  return await deleteEmployee(employee.firstName, employee.familyName);
}
