import { sql } from '@/app/db/db';
import type { Home } from '@/app/types/dataTypes';
import type postgres from 'postgres';
import { MAX_TRAVELLERS } from '@/app/(app)/homes/components/homeForm';

// Type definition for database home
export interface DbHome {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  images: string[];
  geographic_zone: string;
  hours_of_cleaning: number;
  hours_of_gardening: number;
  conciergerie_name: string;
  allow_duo: boolean;
  max_travellers: number;
  notes?: string;
  client_id?: string | null;
}

/**
 * Format a database home to match the application's expected format
 */
function formatHome(dbHome: DbHome): Home {
  return {
    id: dbHome.id,
    title: dbHome.title,
    description: dbHome.description,
    objectives: dbHome.objectives,
    images: dbHome.images,
    geographicZone: dbHome.geographic_zone,
    hoursOfCleaning: Number(dbHome.hours_of_cleaning),
    hoursOfGardening: Number(dbHome.hours_of_gardening),
    conciergerieName: dbHome.conciergerie_name,
    allowDuo: dbHome.allow_duo ?? false,
    maxTravellers: dbHome.max_travellers ?? MAX_TRAVELLERS,
    notes: dbHome.notes,
  };
}

/**
 * Fetch all homes
 */
export const getAllHomes = async (clientId?: string) => {
  try {
    const result = await sql`
      SELECT id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name, allow_duo, max_travellers, notes
      FROM homes
      WHERE (${clientId ?? null}::uuid IS NULL OR client_id = ${clientId ?? null}::uuid)
    `;

    return result.map(row => formatHome(row as DbHome));
  } catch (error) {
    console.error('Error fetching homes:', error);
    return null;
  }
};

/**
 * Homes visible to an employee under the multi-conciergerie model — mirrors
 * getMissionsVisibleToEmployee: homes of their home conciergerie + of
 * multi-enabled conciergeries + homes backing missions already assigned to
 * them (a foreign assignment survives the assigner's downgrade).
 * `visibleNames` NULL = unclaimed legacy employee → full tenant pool.
 */
export const getHomesVisibleToEmployee = async (
  employeeKey: string,
  visibleNames: string[] | null,
  clientId?: string,
) => {
  try {
    const result = await sql`
      SELECT id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name, allow_duo, max_travellers, notes
      FROM homes
      WHERE (
        ${visibleNames}::text[] IS NULL
        OR conciergerie_name = ANY(${visibleNames ?? []}::text[])
        OR id IN (
          SELECT home_id FROM missions
          WHERE employee_id = ${employeeKey} OR employee_id_2 = ${employeeKey}
        )
      )
      AND (${clientId ?? null}::uuid IS NULL OR client_id = ${clientId ?? null}::uuid)
    `;

    return result.map(row => formatHome(row as DbHome));
  } catch (error) {
    console.error(`Error fetching homes visible to ${employeeKey}:`, error);
    return null;
  }
};

/**
 * Same visibility rule as getHomesVisibleToEmployee, for a single home —
 * used by writes (notes) that must not reach an invisible foreign home.
 */
export const isHomeVisibleToEmployee = async (
  employeeKey: string,
  homeId: string,
  visibleNames: string[] | null,
  clientId?: string,
): Promise<boolean> => {
  try {
    const result = await sql`
      SELECT 1 FROM homes
      WHERE id = ${homeId}
      AND (
        ${visibleNames}::text[] IS NULL
        OR conciergerie_name = ANY(${visibleNames ?? []}::text[])
        OR id IN (
          SELECT home_id FROM missions
          WHERE employee_id = ${employeeKey} OR employee_id_2 = ${employeeKey}
        )
      )
      AND (${clientId ?? null}::uuid IS NULL OR client_id = ${clientId ?? null}::uuid)
      LIMIT 1
    `;
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking home visibility for ${employeeKey}:`, error);
    return false;
  }
};

/**
 * Fetch a single home by id
 */
export const getHomeById = async (id: string, clientId?: string) => {
  try {
    const result = await sql`
      SELECT id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name, allow_duo, max_travellers, notes
      FROM homes
      WHERE id = ${id}
      AND (${clientId ?? null}::uuid IS NULL OR client_id = ${clientId ?? null}::uuid)
      LIMIT 1
    `;
    return result.length > 0 ? formatHome(result[0] as DbHome) : null;
  } catch (error) {
    console.error(`Error fetching home ${id}:`, error);
    return null;
  }
};

/**
 * Count a conciergerie's homes (plan limit enforcement)
 */
export const countHomes = async (conciergerieName: string, clientId?: string) => {
  try {
    const result = await sql`
      SELECT COUNT(*)::int AS n
      FROM homes
      WHERE conciergerie_name = ${conciergerieName}
      AND (${clientId ?? null}::uuid IS NULL OR client_id = ${clientId ?? null}::uuid)
    `;
    return (result[0]?.n as number) ?? 0;
  } catch (error) {
    console.error(`Error counting homes for ${conciergerieName}:`, error);
    return 0;
  }
};

/**
 * Create a new home
 */
export const createHome = async (data: DbHome) => {
  try {
    const result = await sql`
      INSERT INTO homes (
        id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name, allow_duo, max_travellers, notes, client_id
      ) VALUES (
        ${data.id}, ${data.title}, ${data.description}, ${data.objectives}, ${data.images}, 
        ${data.geographic_zone}, ${data.hours_of_cleaning}, ${data.hours_of_gardening}, ${data.conciergerie_name}, ${data.allow_duo ?? false}, ${data.max_travellers ?? 1}, ${data.notes ?? null}, ${data.client_id ?? null}
      )
      RETURNING id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name, allow_duo, max_travellers, notes
    `;

    return result.length > 0 ? formatHome(result[0] as DbHome) : null;
  } catch (error) {
    console.error('Error creating home:', error);
    return null;
  }
};

/**
 * Update a home
 */
export const updateHome = async (id: string, data: Partial<Omit<DbHome, 'id'>>, clientId?: string) => {
  try {
    // Prepare update fields
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push(`title = $${values.length + 1}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${values.length + 1}`);
      values.push(data.description);
    }
    if (data.objectives !== undefined) {
      fields.push(`objectives = $${values.length + 1}`);
      values.push(data.objectives);
    }
    if (data.images !== undefined) {
      fields.push(`images = $${values.length + 1}`);
      values.push(data.images);
    }
    if (data.geographic_zone !== undefined) {
      fields.push(`geographic_zone = $${values.length + 1}`);
      values.push(data.geographic_zone);
    }
    if (data.hours_of_cleaning !== undefined) {
      fields.push(`hours_of_cleaning = $${values.length + 1}`);
      values.push(data.hours_of_cleaning);
    }
    if (data.hours_of_gardening !== undefined) {
      fields.push(`hours_of_gardening = $${values.length + 1}`);
      values.push(data.hours_of_gardening);
    }
    if (data.conciergerie_name !== undefined) {
      fields.push(`conciergerie_name = $${values.length + 1}`);
      values.push(data.conciergerie_name);
    }
    if (data.allow_duo !== undefined) {
      fields.push(`allow_duo = $${values.length + 1}`);
      values.push(data.allow_duo);
    }
    if (data.max_travellers !== undefined) {
      fields.push(`max_travellers = $${values.length + 1}`);
      values.push(data.max_travellers);
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${values.length + 1}`);
      values.push(data.notes);
    } else if ('notes' in data) {
      // Explicitly set to NULL when notes is undefined but present in data
      fields.push(`notes = NULL`);
    }

    if (fields.length === 0) return null; // Nothing to update

    // Build and execute query
    values.push(id);
    let where = `WHERE id = $${values.length}`;
    if (clientId) {
      values.push(clientId);
      where += ` AND client_id = $${values.length}::uuid`;
    }
    const query = `
      UPDATE homes
      SET ${fields.join(', ')}
      ${where}
      RETURNING id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name, allow_duo, max_travellers, notes
    `;

    const result = await sql.unsafe(query, values as postgres.ParameterOrJSON<never>[]);

    return result.length > 0 ? formatHome(result[0] as unknown as DbHome) : null;
  } catch (error) {
    console.error(`Error updating home with ID ${id}:`, error);
    return null;
  }
};

/**
 * Delete a home
 */
export const deleteHome = async (id: string, clientId?: string) => {
  try {
    const result = await sql`
      DELETE FROM homes
      WHERE id = ${id}
      AND (${clientId ?? null}::uuid IS NULL OR client_id = ${clientId ?? null}::uuid)
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    console.error(`Error deleting home with ID ${id}:`, error);
    return false;
  }
};
