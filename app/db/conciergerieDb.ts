import { sql } from '@/app/db/db';
import type { ConciergeriePlan } from '@/app/types/dataTypes';
import { getColorValueByName } from '@/app/utils/color';
import { boundDeviceIds } from '@/app/utils/id';
import { defaultConciergerieSettings } from '@/app/utils/notifications';

// Type definition for database conciergerie
export interface DbConciergerie {
  id: string[];
  name: string;
  email: string;
  tel: string;
  color_name: string;
  notification_settings: string | null;
  plan: string;
  client_id?: string | null;
}

/**
 * Format a database conciergerie to match the application's expected format
 */
export function formatConciergerie(dbConciergerie: DbConciergerie) {
  return {
    id: dbConciergerie.id,
    name: dbConciergerie.name,
    email: dbConciergerie.email,
    tel: dbConciergerie.tel,
    colorName: dbConciergerie.color_name,
    color: getColorValueByName(dbConciergerie.color_name),
    notificationSettings: JSON.parse(String(dbConciergerie.notification_settings)) || defaultConciergerieSettings,
    plan: (dbConciergerie.plan ?? 'pro') as ConciergeriePlan,
  };
}

/**
 * Fetch all conciergeries with caching
 * Cache is invalidated when accessing the settings page
 */
export const getAllConciergeries = async () => {
  try {
    const result = await sql`
      SELECT id, name, email, tel, color_name, notification_settings, plan, client_id
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

    const result = await sql`
      UPDATE conciergeries
      SET
        name = COALESCE(${data.name ?? null}, name),
        email = COALESCE(${data.email ?? null}, email),
        tel = COALESCE(${data.tel ?? null}, tel),
        color_name = COALESCE(${data.color_name ?? null}, color_name),
        notification_settings = COALESCE(${data.notification_settings ?? null}::jsonb, notification_settings),
        plan = COALESCE(${data.plan ?? null}, plan)
      WHERE name = ${name}
      RETURNING id, name, email, tel, color_name, notification_settings, plan, client_id
    `;

    return result.length > 0 ? formatConciergerie(result[0] as DbConciergerie) : null;
  } catch (error) {
    console.error(`Error updating conciergerie with name ${name}:`, error);
    return null;
  }
};

/**
 * Fetch a single conciergerie by name
 */
export const getConciergerieByName = async (name: string) => {
  try {
    const result = await sql`
      SELECT id, name, email, tel, color_name, notification_settings, plan, client_id
      FROM conciergeries
      WHERE name = ${name}
      LIMIT 1
    `;
    return result.length > 0 ? formatConciergerie(result[0] as DbConciergerie) : null;
  } catch (error) {
    console.error(`Error fetching conciergerie ${name}:`, error);
    return null;
  }
};

/**
 * The tenant owning a conciergerie — used to stamp `client_id` on rows created
 * under it (new employees, etc.). Returns null when unknown/unset.
 */
export const getConciergerieClientId = async (name: string): Promise<string | null> => {
  try {
    const result = await sql`
      SELECT client_id FROM conciergeries WHERE name = ${name} LIMIT 1
    `;
    return result.length > 0 ? (result[0].client_id as string | null) : null;
  } catch (error) {
    console.error(`Error fetching client_id for conciergerie ${name}:`, error);
    return null;
  }
};

/**
 * Fetch a conciergerie's device id array
 */
export const getConciergerieIds = async (name: string): Promise<string[] | null> => {
  try {
    const result = await sql`
      SELECT id FROM conciergeries WHERE name = ${name}
    `;
    return result.length > 0 ? (result[0].id as string[]) : null;
  } catch (error) {
    console.error(`Error fetching conciergerie ids for ${name}:`, error);
    return null;
  }
};

/**
 * Update a conciergerie's ID
 * @param conciergerieIds - Current array of conciergerie IDs
 * @param name - Current conciergerie name
 * @returns Updated array of conciergerie IDs or null if error
 */
export const updateConciergerieId = async (name: string, conciergerieIds: string[]): Promise<string[] | null> => {
  try {
    if (!name) throw new Error('No name provided');

    const result = await sql`
      UPDATE conciergeries
      SET id = ${boundDeviceIds(conciergerieIds)}::text[]
      WHERE name = ${name}
      RETURNING id
    `;

    return result.length > 0 ? result[0].id : null;
  } catch (error) {
    console.error(`Error updating conciergerie with ID array ${conciergerieIds}:`, error);
    return null;
  }
};
