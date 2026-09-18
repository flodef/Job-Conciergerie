'use server';

import type { DbEmployee } from '@/app/db/employeeDb';
import { PLAN_LIMITS } from '@/app/data/plans';
import {
  countAcceptedEmployees,
  createEmployee,
  deleteEmployee,
  findEmployeeByContact,
  getAllEmployees,
  getEmployeeIds,
  updateEmployeeId,
  updateEmployeeSettings,
  updateEmployeeStatus,
} from '@/app/db/employeeDb';
import { hashId } from '@/app/db/db';
import { DEVICE_TTL_MS, getDeviceSeenAt, seenKey, touchDeviceKeys, touchDevices } from '@/app/db/deviceSeen';
import { checkRateLimit, RATE_LIMITED, type RateLimited } from '@/app/db/rateLimit';
import {
  getSessionCredentialIds,
  getSessionDeviceId,
  getSessionUser,
  isRowMember,
  isValidDeviceIdsUpdate,
  requireConciergerieSession,
  requireConnectedSession,
  tenantScope,
  verifyEnrollmentToken,
} from '@/app/db/session';
import { getConciergerieClientId } from '@/app/db/conciergerieDb';
import { getEmployeeConciergerieName, getSessionPlan } from '@/app/db/planDb';
import type { Employee, EmployeeStatus } from '@/app/types/dataTypes';
import { normalizeFamilyName, normalizeFirstName, normalizePhone } from '@/app/utils/regex';
import { baseId, getDevices, isNewDevice, MaxDevicesError } from '@/app/utils/id';
import type { EmployeeNotificationSettings } from '@/app/utils/notifications';

export type EnrollDeviceResult =
  | { ok: true; ids: string[]; deviceId: string; alreadyMember: boolean; pending: boolean }
  | { ok: false; reason: 'not_found' | 'invalid' | 'max_devices' | 'rate_limited'; oldestDevice?: string };

/**
 * Fetch all employees from the database with caching
 * Cache is refreshed every hour or when explicitly revalidated.
 * Requires a session; device ids are only exposed on the caller's own row (they are credentials).
 */
export async function fetchEmployees(): Promise<Employee[] | null> {
  const session = await getSessionUser();
  if (!session) return null;

  // Pending devices are redacted to their own row anyway — skipping the tenant
  // filter keeps the waiting page working even on a row missing client_id.
  const employees = await getAllEmployees(session.pending ? undefined : tenantScope(session));
  const redacted =
    employees
      ?.map(e => {
        // Stored ids are hashed at rest — match either domain (transition-safe)
        const creds = new Set([session.userId, hashId(session.userId)]);
        if (!e.id.some(i => creds.has(baseId(i)))) return { ...e, id: [] };
        // A pending device sees only its own pending marker — never the real credentials
        return { ...e, id: session.pending ? [`$${hashId(session.userId)}`] : e.id };
      })
      // A pending device only needs its own row (waiting-page status) — don't
      // leak the whole staff directory (names, emails, phones) to it.
      .filter(e => !session.pending || e.id.length > 0) ?? null;

  // Multi-conciergerie: a conciergerie whose plan lacks the feature only sees
  // its own registered staff plus unclaimed legacy rows — the rest of the
  // tenant pool is not theirs to list. Employee sessions keep the directory
  // (coworker names on duo missions), and a non-impersonating admin keeps the
  // unscoped view. Vetting rights are enforced separately on writes.
  if (redacted && session.userType === 'conciergerie' && !(session.isAdmin && !session.impersonating)) {
    if (!PLAN_LIMITS[await getSessionPlan(session)].multiConciergerie) {
      return redacted.filter(e => !e.conciergerieName || e.conciergerieName === session.rowKey);
    }
  }
  return redacted;
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
): Promise<{ employee: Employee; nameMatches: boolean } | RateLimited | null> {
  // Public enumeration vector — bounded per client IP
  if (!(await checkRateLimit('lookupEmployee', 10, 600))) return RATE_LIMITED;
  const result = await findEmployeeByContact(firstName, familyName, normalizePhone(tel), email);
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
}): Promise<Employee | RateLimited | null> {
  // Public account creation — bounded per client IP
  if (!(await checkRateLimit('createEmployee', 5, 600))) return RATE_LIMITED;
  // Always register the caller's own device — never a client-provided id
  const deviceId = await getSessionDeviceId();
  if (!deviceId) return null;

  // The chosen conciergerie must exist — a forged name would leave the row
  // homeless and invisible to every vetting queue.
  const clientId = await getConciergerieClientId(data.conciergerieName);
  if (!clientId) return null;

  // Convert to DB format (device ids are hashed at rest)
  const dbData: Omit<DbEmployee, 'created_at'> = {
    id: [hashId(deviceId)],
    first_name: normalizeFirstName(data.firstName),
    family_name: normalizeFamilyName(data.familyName),
    tel: normalizePhone(data.tel),
    email: data.email,
    geographic_zone: data.geographicZone,
    message: data.message,
    conciergerie_name: data.conciergerieName,
    notification_settings: JSON.stringify(data.notificationSettings),
    status: 'pending',
    // Employees belong to the tenant of the conciergerie they registered under
    client_id: clientId,
  };

  return await createEmployee(dbData);
}

/**
 * Update an employee's status in the database
 */
export async function updateEmployeeStatusAction(employee: Employee, status: EmployeeStatus): Promise<Employee | null> {
  // Status changes (accept/reject/delete) are the conciergerie's vetting
  // prerogative — an employee must not be able to self-accept or alter others.
  const session = await requireConciergerieSession();
  if (!session) return null;

  // Vetting stays the home conciergerie's call — even under multi-conciergerie
  // a foreign employee is usable, never manageable. Unclaimed legacy rows (no
  // home) are the exception: accepting one claims it for the acceptor.
  // The home is resolved server-side — the client payload's conciergerieName
  // is untrusted and could be forged to bypass this check.
  const home = await getEmployeeConciergerieName(
    `${employee.firstName} ${employee.familyName}`,
    session.clientId ?? undefined,
  );
  if (home && home !== session.rowKey) return null;

  if (status === 'accepted') {
    const max = PLAN_LIMITS[await getSessionPlan(session)].maxEmployees;
    if (max !== null && (await countAcceptedEmployees(session.rowKey, tenantScope(session))) >= max) return null;
  }

  const scope = tenantScope(session);
  const updated = await updateEmployeeStatus(
    employee.firstName,
    employee.familyName,
    status,
    scope,
    // Accepting an unclaimed row claims it for this conciergerie.
    status === 'accepted' && !home ? session.rowKey : undefined,
  );
  return updated;
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

  // Enrollment spam is bounded per IP, and a single device cannot fan out
  // across many accounts either (per-device scope).
  if (!(await checkRateLimit('enroll', 10, 600))) return { ok: false, reason: 'rate_limited' };
  if (!(await checkRateLimit('enroll', 5, 3600, deviceId))) return { ok: false, reason: 'rate_limited' };

  const ids = await getEmployeeIds(firstName, familyName);
  if (!ids) return { ok: false, reason: 'not_found' };

  // Stored ids are hashed — normalize this device's own raw entries first so
  // the membership check and getDevices both work in the hash domain.
  const hid = hashId(deviceId);
  let normalized = ids.map(i => (baseId(i) === deviceId ? (isNewDevice(i) ? `$${hid}` : hid) : i));
  // An expired entry must not count as membership — drop it so the device goes
  // back through the token/pending flow (which resets its clock below).
  const ownSeenAt = await getDeviceSeenAt(hid);
  if (ownSeenAt !== undefined && Date.now() - ownSeenAt > DEVICE_TTL_MS)
    normalized = normalized.filter(i => baseId(i) !== hid);
  const alreadyMember = normalized.some(i => !isNewDevice(i) && baseId(i) === hid);
  const hasToken = verifyEnrollmentToken('employee', `${firstName}|${familyName}`, deviceId, token);
  const markPending = !alreadyMember && !hasToken;

  try {
    const newIds = getDevices(normalized, hid, markPending, evictOldest);
    const updated = await updateEmployeeId(firstName, familyName, newIds);
    if (!updated) return { ok: false, reason: 'invalid' };
    // Enrollment is fresh proof (email token or member approval) — reset the clock
    await touchDevices([deviceId]);
    // A pending device gets back only its own marker — never the row's real credentials
    return { ok: true, ids: markPending ? [`$${hid}`] : updated, deviceId, alreadyMember, pending: markPending };
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

  const updated = await updateEmployeeId(employee.firstName, employee.familyName, employeeIds);
  // Entries whose stored form changed (e.g. `$h` approved → `h`) get a fresh
  // clock — approval is explicit member action, and an expired pending entry
  // must not stay dead right after being approved.
  if (updated) {
    const changed = employeeIds.filter(i => !currentIds.includes(i));
    if (changed.length) await touchDeviceKeys(changed.map(seenKey));
  }
  return updated;
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
    notificationSettings?: EmployeeNotificationSettings;
  },
): Promise<Employee | null> {
  const session = await requireConnectedSession();
  if (!session || !employee) return null;

  // Only a connected member of the row may edit it — otherwise any employee
  // could rewrite another employee's profile.
  const ids = await getEmployeeIds(employee.firstName, employee.familyName);
  if (!ids || !isRowMember(session, ids)) return null;

  // conciergerie_name is deliberately absent: the home conciergerie is fixed
  // at registration (claim-on-accept is the only later writer).
  const dbData: Partial<DbEmployee> = {
    tel: data.tel === undefined ? undefined : normalizePhone(data.tel),
    email: data.email,
    geographic_zone: data.geographicZone,
    message: data.message,
    notification_settings: JSON.stringify(data.notificationSettings),
  };

  return await updateEmployeeSettings(employee.firstName, employee.familyName, dbData, tenantScope(session));
}

/**
 * Delete an employee
 */
export async function deleteEmployeeData(employee: Employee): Promise<boolean> {
  const session = await requireConnectedSession();
  if (!session) return false;

  // A conciergerie manages only its own staff — even under multi-conciergerie
  // a foreign employee is usable, never manageable. Unclaimed legacy rows are
  // the exception (any conciergerie may clean them up). Otherwise only a
  // member of the row may delete it (self-removal).
  if (session.userType === 'conciergerie') {
    // Home resolved server-side — the payload's conciergerieName is untrusted.
    const home = await getEmployeeConciergerieName(
      `${employee.firstName} ${employee.familyName}`,
      session.clientId ?? undefined,
    );
    if (home && home !== session.rowKey) return false;
  } else {
    const ids = await getEmployeeIds(employee.firstName, employee.familyName);
    if (!ids || !isRowMember(session, ids)) return false;
  }
  return await deleteEmployee(employee.firstName, employee.familyName, tenantScope(session));
}
