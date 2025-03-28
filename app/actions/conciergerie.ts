'use server';

import { DbConciergerie, getAllConciergeries, updateConciergerie, updateConciergerieId } from '@/app/db/conciergerieDb';
import { Conciergerie } from '@/app/types/types';
import { getColorValueByName } from '@/app/utils/color';
import { revalidateTag } from 'next/cache';

/**
 * Fetch all conciergeries from the database with caching
 * Cache is refreshed every hour or when explicitly revalidated
 */
export async function fetchConciergeries(): Promise<Conciergerie[]> {
  try {
    const conciergeries = await getAllConciergeries();

    // Convert from DB format to application format
    return conciergeries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        tel: c.tel,
        colorName: c.colorName,
        color: getColorValueByName(c.colorName),
        notificationSettings: c.notificationSettings,
      }));
  } catch (error) {
    console.error('Error fetching conciergeries:', error);
    return [];
  }
}

/**
 * Update a conciergerie with a user ID
 * This is used when a user accesses the app with a specific URL (e.g., /abcdef123456)
 */
export async function updateConciergerieWithUserId(
  userId: string,
  conciergerieId: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!userId) return { success: false, message: 'No user ID provided' };
    if (!conciergerieId) return { success: false, message: 'No conciergerie selected' };

    // If the conciergerie already has the correct ID, we don't need to do anything
    if (conciergerieId === userId) return { success: true, message: 'Conciergerie already has the correct ID' };

    // Update the conciergerie's ID in the database
    await updateConciergerieId(conciergerieId, userId);

    // Revalidate cache after update
    revalidateTag('conciergeries');

    return { success: true };
  } catch (error) {
    console.error(`Error updating conciergerie with user ID ${userId}:`, error);
    return { success: false, message: 'Erreur lors de la mise à jour de la conciergerie' };
  }
}

export async function updateConciergerieData(id: string, data: Partial<Conciergerie>): Promise<Conciergerie | null> {
  try {
    if (!id) return null;

    // Convert to DB format
    const dbData: Partial<DbConciergerie> = {
      name: data.name,
      email: data.email,
      tel: data.tel,
      color_name: data.colorName,
      notification_settings: data.notificationSettings,
    };

    const updated = await updateConciergerie(id, dbData);

    if (!updated) return null;

    // Revalidate cache after update
    revalidateTag('conciergeries');

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      tel: updated.tel,
      colorName: updated.colorName,
      color: getColorValueByName(updated.colorName),
      notificationSettings: updated.notificationSettings,
    };
  } catch (error) {
    console.error(`Error updating conciergerie with ID ${id}:`, error);
    return null;
  }
}
