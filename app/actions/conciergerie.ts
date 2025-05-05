'use server';

import { DbConciergerie, getAllConciergeries, updateConciergerie, updateConciergerieId } from '@/app/db/conciergerieDb';
import { Conciergerie } from '@/app/types/dataTypes';
import { getColorValueByName } from '@/app/utils/color';

/**
 * Fetch all conciergeries from the database with caching
 * Cache is refreshed every hour or when explicitly revalidated
 */
export async function fetchConciergeries(): Promise<Conciergerie[] | null> {
  const conciergeries = await getAllConciergeries();

  // Convert from DB format to application format
  return (
    conciergeries
      ?.sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({
        id: c.id,
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
 * Update a conciergerie with a user ID
 * This is used when a user accesses the app with a specific URL (e.g., /abcdef123456)
 */
export async function updateConciergerieWithUserId(
  conciergerie: Conciergerie | undefined,
  conciergerieIds: string[],
): Promise<string[] | null> {
  if (!conciergerie) return null;

  // Update the conciergerie's ID in the database
  return await updateConciergerieId(conciergerie.name, conciergerieIds);
}

export async function updateConciergerieData(
  conciergerie: Conciergerie | undefined,
  data: Partial<Conciergerie>,
): Promise<Conciergerie | null> {
  if (!conciergerie) return null;

  // Convert to DB format
  const dbData: Partial<DbConciergerie> = {
    name: data.name,
    email: data.email,
    tel: data.tel,
    color_name: data.colorName,
    notification_settings: data.notificationSettings,
  };

  return await updateConciergerie(conciergerie.name, dbData);
}
