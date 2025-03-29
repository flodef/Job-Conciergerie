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
  modified_date: Date;
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
      SELECT id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, modified_date, conciergerie_name
      FROM home
      ORDER BY modified_date DESC
    `;

    return result.map(row => formatHome(row as DbHome));
  } catch (error) {
    console.error('Error fetching homes:', error);
    return [];
  }
};

/**
 * Fetch a single home by ID
 */
export const getHomeById = async (id: string) => {
  try {
    const result = await sql`
      SELECT id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, modified_date, conciergerie_name
      FROM home
      WHERE id = ${id}
    `;

    return result.length > 0 ? formatHome(result[0] as DbHome) : null;
  } catch (error) {
    console.error(`Error fetching home with ID ${id}:`, error);
    return null;
  }
};

/**
 * Get homes by conciergerie name
 */
export const getHomesByConciergerieName = async (conciergerieName: string) => {
  try {
    const result = await sql`
      SELECT id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, modified_date, conciergerie_name
      FROM home
      WHERE conciergerie_name = ${conciergerieName}
      ORDER BY modified_date DESC
    `;

    return result.map(row => formatHome(row as DbHome));
  } catch (error) {
    console.error(`Error fetching homes for conciergerie ${conciergerieName}:`, error);
    return [];
  }
};

/**
 * Create a new home
 */
export const createHome = async (data: Omit<DbHome, 'modified_date'>) => {
  try {
    // Convert arrays to JSONB
    const objectives = JSON.stringify(data.objectives);
    const images = JSON.stringify(data.images);

    const result = await sql`
      INSERT INTO home (
        id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name
      ) VALUES (
        ${data.id}, ${data.title}, ${data.description}, ${objectives}::jsonb, ${images}::jsonb, 
        ${data.geographic_zone}, ${data.hours_of_cleaning}, ${data.hours_of_gardening}, ${data.conciergerie_name}
      )
      RETURNING id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, modified_date, conciergerie_name
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
export const updateHome = async (id: string, data: Partial<Omit<DbHome, 'id' | 'modified_date'>>) => {
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
      fields.push(`objectives = $${values.length + 1}::jsonb`);
      values.push(JSON.stringify(data.objectives));
    }

    if (data.images !== undefined) {
      fields.push(`images = $${values.length + 1}::jsonb`);
      values.push(JSON.stringify(data.images));
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

    // Add modified_date update
    fields.push('modified_date = NOW()');

    // Build and execute query
    const query = `
      UPDATE home
      SET ${fields.join(', ')}
      WHERE id = $${values.length + 1}
      RETURNING id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, modified_date, conciergerie_name
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
      DELETE FROM home
      WHERE id = ${id}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    console.error(`Error deleting home with ID ${id}:`, error);
    return false;
  }
};
