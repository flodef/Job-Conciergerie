'use server';

import colors from '@/app/data/colors.json';
import { Conciergerie } from '@/app/types/types';
import {
  DbConciergerie,
  createConciergerie,
  getAllConciergeries,
  getConciergerieById,
  updateConciergerie,
} from '@/app/utils/db';
import { neon } from '@neondatabase/serverless';
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
        color: getColorValue(c.colorName),
        notificationSettings: c.notificationSettings,
      }));
  } catch (error) {
    console.error('Error fetching conciergeries:', error);
    return [];
  }
}

/**
 * Fetch a single conciergerie by id
 */
export async function fetchConciergerieById(id: string): Promise<Conciergerie | null> {
  try {
    const conciergerie = await getConciergerieById(id);

    if (!conciergerie) return null;

    return {
      id: conciergerie.id,
      name: conciergerie.name,
      email: conciergerie.email,
      tel: conciergerie.tel,
      colorName: conciergerie.colorName,
      color: getColorValue(conciergerie.colorName),
      notificationSettings: conciergerie.notificationSettings,
    };
  } catch (error) {
    console.error(`Error fetching conciergerie by ID ${id}:`, error);
    return null;
  }
}

/**
 * Fetch a single conciergerie by name
 */
export async function fetchConciergerieByName(name: string): Promise<Conciergerie | null> {
  try {
    const conciergeries = await getAllConciergeries();
    const conciergerie = conciergeries.find(c => c.name === name);

    if (!conciergerie) return null;

    return {
      id: conciergerie.id,
      name: conciergerie.name,
      email: conciergerie.email,
      tel: conciergerie.tel,
      colorName: conciergerie.colorName,
      color: getColorValue(conciergerie.colorName),
      notificationSettings: conciergerie.notificationSettings,
    };
  } catch (error) {
    console.error(`Error fetching conciergerie by name ${name}:`, error);
    return null;
  }
}

/**
 * Create a new conciergerie in the database
 */
export async function createConciergerieData(data: Partial<Conciergerie>): Promise<Conciergerie | null> {
  try {
    // Convert from application format to DB format
    const dbData: Omit<DbConciergerie, 'id'> = {
      name: data.name || '',
      email: data.email || '',
      tel: data.tel || '',
      color_name: data.colorName || '',
      notification_settings: data.notificationSettings,
    };

    // Create the conciergerie in the database
    const result = await createConciergerie(dbData);

    // Revalidate the conciergeries cache
    revalidateTag('conciergeries');

    if (!result) return null;

    // Return the conciergerie with the color value
    return {
      id: result.id,
      name: result.name,
      email: result.email,
      tel: result.tel,
      colorName: result.colorName,
      color: getColorValue(result.colorName),
      notificationSettings: result.notificationSettings,
    };
  } catch (error) {
    console.error('Error creating conciergerie:', error);
    return null;
  }
}

/**
 * Create a new conciergerie with the user's ID
 * This is used for the initial registration process
 */
export async function createNewConciergerie(data: Partial<Conciergerie>): Promise<Conciergerie | null> {
  try {
    if (!data.id) {
      throw new Error('User ID is required');
    }

    if (!data.name) {
      throw new Error('Conciergerie name is required');
    }

    // Check if a conciergerie with this ID already exists
    const existingConciergerie = await getConciergerieById(data.id);

    if (existingConciergerie) {
      // If it exists, return it without creating a new one
      return {
        id: existingConciergerie.id,
        name: existingConciergerie.name,
        email: existingConciergerie.email,
        tel: existingConciergerie.tel,
        colorName: existingConciergerie.colorName,
        color: getColorValue(existingConciergerie.colorName),
        notificationSettings: existingConciergerie.notificationSettings,
      };
    }

    // Get the conciergerie data from the database based on name
    const conciergeries = await getAllConciergeries();
    const conciergerieData = conciergeries.find(c => c.name === data.name);

    if (!conciergerieData) {
      throw new Error(`Conciergerie with name ${data.name} not found`);
    }

    // Update the conciergerie with the user ID
    const updatedConciergerie = await updateConciergerie(conciergerieData.id, {
      id: data.id,
    });

    if (!updatedConciergerie) {
      throw new Error('Failed to update conciergerie with user ID');
    }

    // Revalidate the conciergeries cache
    revalidateTag('conciergeries');

    // Return the updated conciergerie
    return {
      id: updatedConciergerie.id,
      name: updatedConciergerie.name,
      email: updatedConciergerie.email,
      tel: updatedConciergerie.tel,
      colorName: updatedConciergerie.colorName,
      color: getColorValue(updatedConciergerie.colorName),
      notificationSettings: updatedConciergerie.notificationSettings,
    };
  } catch (error) {
    console.error('Error creating new conciergerie:', error);
    throw error;
  }
}

/**
 * Update a conciergerie's data in the database
 */
/**
 * Update a conciergerie with a user ID
 * This is used when a user accesses the app with a specific URL (e.g., /abcdef123456)
 */
export async function updateConciergerieWithUserId(
  userId: string,
  conciergerieName: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    if (!conciergerieName) {
      return { success: false, message: 'Aucune conciergerie sélectionnée' };
    }

    // Fetch the conciergerie by name
    const conciergerie = await fetchConciergerieByName(conciergerieName);

    if (!conciergerie) {
      return { success: false, message: 'Conciergerie non trouvée' };
    }

    // If the conciergerie already has the correct ID, we don't need to do anything
    if (conciergerie.id === userId) {
      return { success: true, message: 'Conciergerie already has the correct ID' };
    }

    // Initialize neon client
    const sql = neon(process.env.DATABASE_URL as string);

    // Update the conciergerie's ID in the database
    await sql`
      UPDATE conciergerie
      SET id = ${userId}
      WHERE name = ${conciergerieName}
    `;

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
      color: getColorValue(updated.colorName),
      notificationSettings: updated.notificationSettings,
    };
  } catch (error) {
    console.error(`Error updating conciergerie with ID ${id}:`, error);
    return null;
  }
}

/**
 * Helper function to get color value from color name
 * Uses the colors defined in colors.json
 */
function getColorValue(colorName: string): string {
  // Find matching color
  const color = colors.find(c => c.name === colorName);

  // Return matching color value or default CSS variable
  return color?.value || 'var(--color-default)';
}
