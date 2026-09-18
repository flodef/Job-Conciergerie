import { sql } from '@/app/db/db';
import type { Conciergerie, ConciergeriePlan } from '@/app/types/dataTypes';
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
  discount: number;
  billing_period: string;
  plan_until: string | Date | null;
}

/**
 * Format a database conciergerie to match the application's expected format
 */
export function formatConciergerie(dbConciergerie: DbConciergerie): Conciergerie {
  return {
    id: dbConciergerie.id,
    name: dbConciergerie.name,
    email: dbConciergerie.email,
    tel: dbConciergerie.tel,
    colorName: dbConciergerie.color_name,
    color: getColorValueByName(dbConciergerie.color_name),
    notificationSettings: JSON.parse(String(dbConciergerie.notification_settings)) || defaultConciergerieSettings,
    plan: (dbConciergerie.plan ?? 'pro') as ConciergeriePlan,
    discount: dbConciergerie.discount ?? 0,
    billingPeriod: dbConciergerie.billing_period === 'annual' ? 'annual' : 'monthly',
    planUntil: dbConciergerie.plan_until ? new Date(dbConciergerie.plan_until).toISOString() : undefined,
  };
}

/**
 * Fetch all conciergeries with caching
 * Cache is invalidated when accessing the settings page
 */
export const getAllConciergeries = async (includeAdminRows = false) => {
  try {
    const result = await sql`
      SELECT c.id, c.name, c.email, c.tel, c.color_name, c.notification_settings, c.plan, c.client_id,
             c.discount, c.billing_period, c.plan_until
      FROM conciergeries c
      LEFT JOIN clients cl ON cl.id = c.client_id
      WHERE ${includeAdminRows} OR COALESCE(cl.is_admin, false) = false
    `;
    return result.map(row => formatConciergerie(row as DbConciergerie));
  } catch (error) {
    console.error('Error fetching conciergeries:', error);
    return null;
  }
};

/**
 * The multi-conciergerie group a client belongs to: the client's display name
 * plus every conciergerie sharing its client_id. A solo conciergerie returns
 * a single member (itself).
 */
export const getGroupForClient = async (
  clientId: string,
): Promise<{ name: string | null; members: string[] } | null> => {
  try {
    const [client, members] = await Promise.all([
      sql`SELECT name FROM clients WHERE id = ${clientId}::uuid LIMIT 1`,
      sql`SELECT name FROM conciergeries WHERE client_id = ${clientId}::uuid ORDER BY name`,
    ]);
    return { name: (client[0]?.name as string) ?? null, members: members.map(r => r.name as string) };
  } catch (error) {
    console.error(`Error fetching group for client ${clientId}:`, error);
    return null;
  }
};

/**
 * Update a conciergerie's data.
 * `clientId` scopes the row to its tenant (undefined = unscoped, admin/cron).
 */
export const updateConciergerie = async (
  name: string | undefined,
  data: Partial<DbConciergerie>,
  clientId?: string,
) => {
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
      WHERE name = ${name} AND (${clientId ?? null}::uuid IS NULL OR client_id = ${clientId ?? null}::uuid)
      RETURNING id, name, email, tel, color_name, notification_settings, plan, client_id, discount, billing_period, plan_until
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
      SELECT id, name, email, tel, color_name, notification_settings, plan, client_id,
             discount, billing_period, plan_until
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
