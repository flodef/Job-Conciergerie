'use server';

import type { DbHome } from '@/app/db/homeDb';
import { createHome, deleteHome, getAllHomes, getHomeById, updateHome } from '@/app/db/homeDb';
import { requireConciergerieSession, requireConnectedSession } from '@/app/db/session';
import type { Home } from '@/app/types/dataTypes';

/**
 * Fetch all homes
 */
export async function fetchAllHomes(): Promise<Home[] | null> {
  if (!(await requireConnectedSession())) return null;
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
  allowDuo?: boolean;
  maxTravellers?: number;
  notes?: string;
}): Promise<Home | null> {
  // Homes belong to the conciergerie's catalog — employees must not create them,
  // and a conciergerie only writes in its own tenant
  const session = await requireConciergerieSession();
  if (!session || data.conciergerieName !== session.rowKey) return null;

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
    allow_duo: data.allowDuo ?? false,
    max_travellers: data.maxTravellers ?? 1,
    notes: data.notes,
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
    allowDuo: boolean;
    maxTravellers: number;
    notes?: string;
  }>,
): Promise<Home | null> {
  // Catalog management is conciergerie-only (notes go through updateHomeNotes)
  const session = await requireConciergerieSession();
  if (!session) return null;
  const home = await getHomeById(id);
  if (!home || home.conciergerieName !== session.rowKey) return null;

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
    allow_duo: data.allowDuo,
    max_travellers: data.maxTravellers,
    notes: data.notes,
  };

  return await updateHome(id, dbData);
}

/**
 * Update only the notes field of a home
 */
export async function updateHomeNotes(id: string, notes: string | undefined): Promise<Home | null> {
  if (!(await requireConnectedSession())) return null;
  return await updateHome(id, { notes });
}

/**
 * Delete a home from the database
 */
export async function deleteHomeData(id: string): Promise<boolean> {
  const session = await requireConciergerieSession();
  if (!session) return false;
  const home = await getHomeById(id);
  if (!home || home.conciergerieName !== session.rowKey) return false;
  return await deleteHome(id);
}
