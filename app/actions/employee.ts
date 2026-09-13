'use server';

import type { DbEmployee } from '@/app/db/employeeDb';
import {
  createEmployee,
  deleteEmployee,
  findEmployeeByContact,
  getAllEmployees,
  getEmployeeIds,
  updateEmployeeId,
  updateEmployeeSettings,
  updateEmployeeStatus,
} from '@/app/db/employeeDb';
import {
  getSessionCredentialIds,
  getSessionDeviceId,
  getSessionUser,
  isValidDeviceIdsUpdate,
  requireConnectedSession,
  verifyEnrollmentToken,
} from '@/app/db/session';
import type { Employee, EmployeeStatus } from '@/app/types/dataTypes';
import { normalizeFamilyName, normalizeFirstName } from '@/app/utils/employee';
import { baseId, getDevices, isNewDevice, MaxDevicesError } from '@/app/utils/id';
import type { EmployeeNotificationSettings } from '@/app/utils/notifications';

export type EnrollDeviceResult =
  | { ok: true; ids: string[]; deviceId: string; alreadyMember: boolean; pending: boolean }
  | { ok: false; reason: 'not_found' | 'invalid' | 'max_devices'; oldestDevice?: string };

/**
 * Fetch all employees from the database with caching
 * Cache is refreshed every hour or when explicitly revalidated.
 * Requires a session; device ids are only exposed on the caller's own row (they are credentials).
 */
export async function fetchEmployees(): Promise<Employee[] | null> {
  const session = await getSessionUser();
  if (!session) return null;

  const employees = await getAllEmployees();
  return (
    employees?.map(e => {
      if (!e.id.some(i => baseId(i) === session.userId)) return { ...e, id: [] };
      // A pending device sees only its own pending marker — never the real credentials
      return { ...e, id: session.pending ? [`$${session.userId}`] : e.id };
    }) ?? null
  );
}

/**
 * Look up an employee by tel/email (unique identifiers).
 * Returns the employee + whether the provided name matches.
 * - match found + nameMatches: same person, proceed with device update
 * - match found + !nameMatches: conflict, someone else owns this tel/email
 * - null: no match, safe to create new employee
 */
export async function lookupEmployeeByContact(
  firstName: string,
  familyName: string,
  tel: string,
  email: string,
): Promise<{ employee: Employee; nameMatches: boolean } | null> {
  const result = await findEmployeeByContact(firstName, familyName, tel, email);
  if (!result) return null;
  const { employee: row, nameMatches } = result;
  return {
    employee: {
      // Device ids are credentials — never exposed through a public lookup
      id: [],
      firstName: row.first_name,
      familyName: row.family_name,
      tel: row.tel,
      email: row.email,
      geographicZone: row.geographic_zone,
      message: row.message || '',
      conciergerieName: row.conciergerie_name,
      status: row.status,
      notificationSettings: JSON.parse(String(row.notification_settings)),
      createdAt: row.created_at,
    },
    nameMatches,
  };
}

/**
 * Create a new employee in the database
 */
export async function createNewEmployee(data: {
  firstName: string;
  familyName: string;
  tel: string;
  email: string;
  geographicZone: string;
  message?: string;
  conciergerieName: string;
  notificationSettings?: EmployeeNotificationSettings;
}): Promise<Employee | null> {
  // Always register the caller's own device — never a client-provided id
  const deviceId = await getSessionDeviceId();
  if (!deviceId) return null;

  // Convert to DB format
  const dbData: Omit<DbEmployee, 'created_at'> = {
    id: [deviceId],
    first_name: normalizeFirstName(data.firstName),
    family_name: normalizeFamilyName(data.familyName),
    tel: data.tel,
    email: data.email,
    geographic_zone: data.geographicZone,
    message: data.message,
    conciergerie_name: data.conciergerieName,
    notification_settings: JSON.stringify(data.notificationSettings),
    status: 'pending',
  };

  return await createEmployee(dbData);
}

/**
 * Update an employee's status in the database
 */
export async function updateEmployeeStatusAction(employee: Employee, status: EmployeeStatus): Promise<Employee | null> {
  if (!(await requireConnectedSession())) return null;
  return await updateEmployeeStatus(employee.firstName, employee.familyName, status);
}

/**
 * Enroll the session device in an employee's id array.
 * The new array is computed server-side from the current row:
 * - connected member → re-enrolls freely (no proof needed);
 * - valid email token → connects the device immediately;
 * - anything else → the device is added as a pending (`$`) access request that a
 *   connected member can approve from Settings — pending devices have no session
 *   privileges until approved.
 */
export async function enrollEmployeeDevice(
  firstName: string,
  familyName: string,
  evictOldest: boolean,
  token?: string,
): Promise<EnrollDeviceResult> {
  const session = await getSessionUser();
  const deviceId = session?.userId ?? (await getSessionDeviceId());
  if (!deviceId || !firstName || !familyName) return { ok: false, reason: 'invalid' };

  const ids = await getEmployeeIds(firstName, familyName);
  if (!ids) return { ok: false, reason: 'not_found' };

  const alreadyMember = ids.some(i => !isNewDevice(i) && baseId(i) === deviceId);
  const hasToken = verifyEnrollmentToken('employee', `${firstName}|${familyName}`, deviceId, token);
  const markPending = !alreadyMember && !hasToken;

  try {
    const newIds = getDevices(ids, deviceId, markPending, evictOldest);
    const updated = await updateEmployeeId(firstName, familyName, newIds);
    if (!updated) return { ok: false, reason: 'invalid' };
    // A pending device gets back only its own marker — never the row's real credentials
    return { ok: true, ids: markPending ? [`$${deviceId}`] : updated, deviceId, alreadyMember, pending: markPending };
  } catch (error) {
    if (error instanceof MaxDevicesError) return { ok: false, reason: 'max_devices', oldestDevice: error.oldestDevice };
    throw error;
  }
}

/**
 * Update an employee's list of associated user IDs.
 * Restricted to connected devices of the row managing their own device list —
 * new-device enrollment goes through `enrollEmployeeDevice`.
 */
export async function updateEmployeeWithUserId(
  employee: Employee | undefined,
  employeeIds: string[],
): Promise<string[] | null> {
  if (!employee?.firstName || !employee?.familyName) return null;

  const sessionIds = await getSessionCredentialIds();
  if (!sessionIds.size) return null;

  const currentIds = await getEmployeeIds(employee.firstName, employee.familyName);
  if (!currentIds || !isValidDeviceIdsUpdate(currentIds, employeeIds, sessionIds)) return null;

  return await updateEmployeeId(employee.firstName, employee.familyName, employeeIds);
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
  if (!(await requireConnectedSession()) || !employee) return null;

  // Convert to DB format
  const dbData: Partial<DbEmployee> = {
    tel: data.tel,
    email: data.email,
    geographic_zone: data.geographicZone,
    message: data.message,
    conciergerie_name: data.conciergerieName,
    notification_settings: JSON.stringify(data.notificationSettings),
  };

  return await updateEmployeeSettings(employee.firstName, employee.familyName, dbData);
}

/**
 * Delete an employee
 */
export async function deleteEmployeeData(employee: Employee): Promise<boolean> {
  if (!(await requireConnectedSession())) return false;
  return await deleteEmployee(employee.firstName, employee.familyName);
}
