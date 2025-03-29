'use server';

import {
  DbHome,
  createHome,
  deleteHome,
  getAllHomes,
  getHomeById,
  getHomesByConciergerieName,
  updateHome,
} from '@/app/db/homeDb';
import { Home } from '@/app/types/dataTypes';
import { revalidateTag } from 'next/cache';

/**
 * Fetch all homes from the database
 */
export async function fetchHomes(): Promise<Home[]> {
  try {
    const homes = await getAllHomes();
    return homes;
  } catch (error) {
    console.error('Error fetching homes:', error);
    return [];
  }
}

/**
 * Fetch a single home by ID
 */
export async function fetchHomeById(id: string): Promise<Home | null> {
  try {
    const home = await getHomeById(id);
    return home;
  } catch (error) {
    console.error(`Error fetching home with ID ${id}:`, error);
    return null;
  }
}

/**
 * Fetch homes by conciergerie name
 */
export async function fetchHomesByConciergerieName(conciergerieName: string): Promise<Home[]> {
  try {
    const homes = await getHomesByConciergerieName(conciergerieName);
    return homes;
  } catch (error) {
    console.error(`Error fetching homes for conciergerie ${conciergerieName}:`, error);
    return [];
  }
}

/**
 * Create a new home in the database
 */
export async function createNewHome(data: {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  images: string[];
  geographicZone: string;
  hoursOfCleaning: number;
  hoursOfGardening: number;
  conciergerieName: string;
}): Promise<Home | null> {
  try {
    // Convert to DB format
    const dbData: Omit<DbHome, 'modified_date'> = {
      id: data.id,
      title: data.title,
      description: data.description,
      objectives: data.objectives,
      images: data.images,
      geographic_zone: data.geographicZone,
      hours_of_cleaning: data.hoursOfCleaning,
      hours_of_gardening: data.hoursOfGardening,
      conciergerie_name: data.conciergerieName,
    };

    const created = await createHome(dbData);

    if (!created) return null;

    // Revalidate cache after creation
    revalidateTag('homes');
    revalidateTag('homes_by_conciergerie');

    return created;
  } catch (error) {
    console.error('Error creating home:', error);
    return null;
  }
}

/**
 * Update a home in the database
 */
export async function updateHomeData(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    objectives: string[];
    images: string[];
    geographicZone: string;
    hoursOfCleaning: number;
    hoursOfGardening: number;
    conciergerieName: string;
  }>,
): Promise<Home | null> {
  try {
    // Convert to DB format
    const dbData: Partial<Omit<DbHome, 'id' | 'modified_date'>> = {};

    if (data.title !== undefined) dbData.title = data.title;
    if (data.description !== undefined) dbData.description = data.description;
    if (data.objectives !== undefined) dbData.objectives = data.objectives;
    if (data.images !== undefined) dbData.images = data.images;
    if (data.geographicZone !== undefined) dbData.geographic_zone = data.geographicZone;
    if (data.hoursOfCleaning !== undefined) dbData.hours_of_cleaning = data.hoursOfCleaning;
    if (data.hoursOfGardening !== undefined) dbData.hours_of_gardening = data.hoursOfGardening;
    if (data.conciergerieName !== undefined) dbData.conciergerie_name = data.conciergerieName;

    const updated = await updateHome(id, dbData);

    if (!updated) return null;

    // Revalidate cache after update
    revalidateTag('homes');
    revalidateTag('homes_by_conciergerie');
    revalidateTag('home');

    return updated;
  } catch (error) {
    console.error(`Error updating home with ID ${id}:`, error);
    return null;
  }
}

/**
 * Delete a home from the database
 */
export async function deleteHomeData(id: string): Promise<boolean> {
  try {
    const deleted = await deleteHome(id);

    if (!deleted) return false;

    // Revalidate cache after deletion
    revalidateTag('homes');
    revalidateTag('homes_by_conciergerie');

    return true;
  } catch (error) {
    console.error(`Error deleting home with ID ${id}:`, error);
    return false;
  }
}
