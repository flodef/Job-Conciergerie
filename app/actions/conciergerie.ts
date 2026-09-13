'use server';

import type { DbConciergerie } from '@/app/db/conciergerieDb';
import {
  getAllConciergeries,
  getConciergerieIds,
  updateConciergerie,
  updateConciergerieId,
} from '@/app/db/conciergerieDb';
import {
  getSessionCredentialIds,
  getSessionDeviceId,
  getSessionUser,
  isValidDeviceIdsUpdate,
  verifyEnrollmentToken,
} from '@/app/db/session';
import type { EnrollDeviceResult } from '@/app/actions/employee';
import type { Conciergerie } from '@/app/types/dataTypes';
import { getColorValueByName } from '@/app/utils/color';
import { baseId, getDevices, MaxDevicesError } from '@/app/utils/id';

/**
 * Fetch all conciergeries from the database with caching
 * Cache is refreshed every hour or when explicitly revalidated.
 * Public (the registration form lists conciergeries) but device ids are only
 * exposed on the caller's own row — they are credentials.
 */
export async function fetchConciergeries(): Promise<Conciergerie[] | null> {
  const session = await getSessionUser();
  const conciergeries = await getAllConciergeries();

  // Convert from DB format to application format
  return (
    conciergeries
      ?.sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({
        id: session && c.id.some(i => baseId(i) === session.userId) ? c.id : [],
        name: c.name,
        email: c.email,
        tel: c.tel,
        colorName: c.colorName,
        color: getColorValueByName(c.colorName),
        notificationSettings: c.notificationSettings,
      })) ?? null
  );
}

/**
 * Enroll the session device in a conciergerie's id array.
 * The new array is computed server-side from the current row — the client only
 * expresses intent (mark as pending device / evict the oldest device at the limit).
 */
export async function enrollConciergerieDevice(
  name: string,
  evictOldest: boolean,
  token?: string,
): Promise<EnrollDeviceResult> {
  const session = await getSessionUser();
  const deviceId = session?.userId ?? (await getSessionDeviceId());
  if (!deviceId || !name) return { ok: false, reason: 'invalid' };

  const ids = await getConciergerieIds(name);
  if (!ids) return { ok: false, reason: 'not_found' };

  const alreadyMember = ids.some(i => baseId(i) === deviceId);
  if (!alreadyMember && !verifyEnrollmentToken('conciergerie', name, deviceId, token))
    return { ok: false, reason: 'unauthorized' };

  try {
    const newIds = getDevices(ids, deviceId, false, evictOldest);
    const updated = await updateConciergerieId(name, newIds);
    return updated ? { ok: true, ids: updated, deviceId, alreadyMember } : { ok: false, reason: 'invalid' };
  } catch (error) {
    if (error instanceof MaxDevicesError) return { ok: false, reason: 'max_devices', oldestDevice: error.oldestDevice };
    throw error;
  }
}

/**
 * Update a conciergerie with a user ID.
 * Restricted to connected devices of the row managing their own device list —
 * new-device enrollment goes through `enrollConciergerieDevice`.
 */
export async function updateConciergerieWithUserId(
  conciergerie: Conciergerie | undefined,
  conciergerieIds: string[],
): Promise<string[] | null> {
  if (!conciergerie) return null;

  const sessionIds = await getSessionCredentialIds();
  if (!sessionIds.size) return null;

  const currentIds = await getConciergerieIds(conciergerie.name);
  if (!currentIds || !isValidDeviceIdsUpdate(currentIds, conciergerieIds, sessionIds)) return null;

  // Update the conciergerie's ID in the database
  return await updateConciergerieId(conciergerie.name, conciergerieIds);
}

export async function updateConciergerieData(
  conciergerie: Conciergerie | undefined,
  data: Partial<Conciergerie>,
): Promise<Conciergerie | null> {
  if (!(await getSessionUser()) || !conciergerie) return null;

  // Convert to DB format
  const dbData: Partial<DbConciergerie> = {
    name: data.name,
    email: data.email,
    tel: data.tel,
    color_name: data.colorName,
    notification_settings: data.notificationSettings ? JSON.stringify(data.notificationSettings) : null,
  };

  return await updateConciergerie(conciergerie.name, dbData);
}
