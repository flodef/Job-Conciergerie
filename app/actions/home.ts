'use server';

import { DbHome, createHome, deleteHome, getAllHomes, updateHome } from '@/app/db/homeDb';
import { Home } from '@/app/types/dataTypes';

/**
 * Fetch all homes
 */
export async function fetchAllHomes(): Promise<Home[] | null> {
  return await getAllHomes();
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

  return await createHome(dbData);
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
  // Convert to DB format
  const dbData: Partial<Omit<DbHome, 'id'>> = {
    title: data.title,
    description: data.description,
    objectives: data.objectives,
    images: data.images,
    geographic_zone: data.geographicZone,
    hours_of_cleaning: data.hoursOfCleaning,
    hours_of_gardening: data.hoursOfGardening,
    conciergerie_name: data.conciergerieName,
  };

  return await updateHome(id, dbData);
}

/**
 * Delete a home from the database
 */
export async function deleteHomeData(id: string): Promise<boolean> {
  return await deleteHome(id);
}
