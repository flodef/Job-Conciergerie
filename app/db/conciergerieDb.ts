import { sql } from '@/app/db/db';
import { getColorValueByName } from '@/app/utils/color';
import { ConciergerieNotificationSettings, defaultConciergerieSettings } from '@/app/utils/notifications';

// Type definition for database conciergerie
export interface DbConciergerie {
  id: string[];
  name: string;
  email: string;
  tel: string;
  color_name: string;
  notification_settings?: ConciergerieNotificationSettings;
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
    notificationSettings: dbConciergerie.notification_settings || defaultConciergerieSettings,
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
        FROM conciergeries
      `;

    return result.map(row => formatConciergerie(row as DbConciergerie));
  } catch (error) {
    console.error('Error fetching conciergeries:', error);
    return null;
  }
};

/**
 * Update a conciergerie's data
 */
export const updateConciergerie = async (name: string | undefined, data: Partial<DbConciergerie>) => {
  try {
    if (!name) throw new Error('No name provided');

    // Convert notification_settings to JSONB if present
    const notificationSettings = data.notification_settings ? JSON.stringify(data.notification_settings) : null;

    const result = await sql`
      UPDATE conciergeries
      SET 
        name = COALESCE(${data.name}, name),
        email = COALESCE(${data.email}, email),
        tel = COALESCE(${data.tel}, tel),
        color_name = COALESCE(${data.color_name}, color_name),
        notification_settings = COALESCE(${notificationSettings}::jsonb, notification_settings)
      WHERE name = ${name}
      RETURNING id, name, email, tel, color_name, notification_settings
    `;

    return result.length > 0 ? formatConciergerie(result[0] as DbConciergerie) : null;
  } catch (error) {
    console.error(`Error updating conciergerie with name ${name}:`, error);
    return null;
  }
};

/**
 * Update a conciergerie's ID
 */
export const updateConciergerieId = async (conciergerieId: string[], id: string): Promise<string[] | null> => {
  try {
    if (!conciergerieId || conciergerieId.length === 0) throw new Error('No conciergerie ID array provided');
    if (!id) throw new Error('No ID provided');
    if (conciergerieId.includes(id)) throw new Error('ID already in conciergerie ID array');

    const newIdArray = [id, ...conciergerieId].slice(0, 3);
    const result = await sql`
      UPDATE conciergeries
      SET id = ${newIdArray}::text[]
      WHERE id = ${conciergerieId}::text[]
      RETURNING id
    `;

    return result.length > 0 ? result[0].id : null;
  } catch (error) {
    console.error(`Error updating conciergerie with ID array ${conciergerieId}:`, error);
    return null;
  }
};
