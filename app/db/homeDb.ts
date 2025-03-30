import { sql } from '@/app/db/db';
import { Home } from '@/app/types/dataTypes';

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
    hoursOfCleaning: dbHome.hours_of_cleaning,
    hoursOfGardening: dbHome.hours_of_gardening,
    conciergerieName: dbHome.conciergerie_name,
  };
}

/**
 * Fetch all homes
 */
export const getAllHomes = async () => {
  try {
    const result = await sql`
      SELECT id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name
      FROM homes
    `;

    return result.map(row => formatHome(row as DbHome));
  } catch (error) {
    console.error('Error fetching homes:', error);
    return null;
  }
};

/**
 * Create a new home
 */
export const createHome = async (data: DbHome) => {
  try {
    const result = await sql`
      INSERT INTO homes (
        id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name
      ) VALUES (
        ${data.id}, ${data.title}, ${data.description}, ${data.objectives}, ${data.images}, 
        ${data.geographic_zone}, ${data.hours_of_cleaning}, ${data.hours_of_gardening}, ${data.conciergerie_name}
      )
      RETURNING id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name
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
export const updateHome = async (id: string, data: Partial<Omit<DbHome, 'id'>>) => {
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

    if (fields.length === 0) return null; // Nothing to update

    // Build and execute query
    const query = `
      UPDATE homes
      SET ${fields.join(', ')}
      WHERE id = $${values.length + 1}
      RETURNING id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name
    `;
    values.push(id);

    const result = await sql.query(query, values);

    return result.length > 0 ? formatHome(result[0] as DbHome) : null;
  } catch (error) {
    console.error(`Error updating home with ID ${id}:`, error);
    return null;
  }
};

/**
 * Delete a home
 */
export const deleteHome = async (id: string) => {
  try {
    const result = await sql`
      DELETE FROM homes
      WHERE id = ${id}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    console.error(`Error deleting home with ID ${id}:`, error);
    return false;
  }
};
