'use server';

import { PLAN_LIMITS } from '@/app/data/plans';
import type { DbHome } from '@/app/db/homeDb';
import {
  countHomes,
  createHome,
  deleteHome,
  getAllHomes,
  getHomeById,
  getHomesVisibleToEmployee,
  isHomeVisibleToEmployee,
  updateHome,
} from '@/app/db/homeDb';
import { getEmployeeConciergerieName, getMultiConciergerieNames, getSessionPlan } from '@/app/db/planDb';
import { requireConciergerieSession, requireConnectedSession, tenantScope } from '@/app/db/session';
import type { Home } from '@/app/types/dataTypes';

/**
 * Fetch all homes
 */
export async function fetchAllHomes(): Promise<Home[] | null> {
  const session = await requireConnectedSession();
  if (!session) return null;
  const scope = tenantScope(session);

  // Multi-conciergerie: same visibility rule as missions — an employee only
  // receives homes they can actually work on (home conciergerie, multi-enabled
  // conciergeries, plus homes behind their own assignments).
  if (session.userType === 'employee') {
    const home = await getEmployeeConciergerieName(session.rowKey, session.clientId ?? undefined);
    const visible = home ? [home, ...(await getMultiConciergerieNames(scope))] : null;
    return await getHomesVisibleToEmployee(session.rowKey, visible, scope);
  }
  return await getAllHomes(scope);
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

  const limits = PLAN_LIMITS[await getSessionPlan(session)];
  if (data.allowDuo && !limits.duo) return null;
  if (limits.maxHomes !== null && (await countHomes(data.conciergerieName, tenantScope(session))) >= limits.maxHomes)
    return null;

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
    client_id: session.clientId,
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
  const scope = tenantScope(session);
  const home = await getHomeById(id, scope);
  if (!home || home.conciergerieName !== session.rowKey) return null;
  if (data.allowDuo && !PLAN_LIMITS[await getSessionPlan(session)].duo) return null;

  // Convert to DB format — conciergerie_name deliberately excluded: home
  // ownership must not move across conciergeries through a forged field.
  const dbData: Partial<Omit<DbHome, 'id' | 'conciergerie_name'>> = {
    title: data.title,
    description: data.description,
    objectives: data.objectives,
    images: data.images,
    geographic_zone: data.geographicZone,
    hours_of_cleaning: data.hoursOfCleaning,
    hours_of_gardening: data.hoursOfGardening,
    allow_duo: data.allowDuo,
    max_travellers: data.maxTravellers,
    notes: data.notes,
  };

  return await updateHome(id, dbData, scope);
}

/**
 * Update only the notes field of a home
 */
export async function updateHomeNotes(id: string, notes: string | undefined): Promise<Home | null> {
  const session = await requireConnectedSession();
  if (!session) return null;
  const scope = tenantScope(session);

  // Employees write notes on homes they work on — the same visibility rule as
  // fetchAllHomes applies, so a foreign non-multi home can't be annotated.
  if (session.userType === 'employee') {
    const home = await getEmployeeConciergerieName(session.rowKey, session.clientId ?? undefined);
    const visible = home ? [home, ...(await getMultiConciergerieNames(scope))] : null;
    if (!(await isHomeVisibleToEmployee(session.rowKey, id, visible, scope))) return null;
  } else {
    // A conciergerie only annotates its own catalog
    const target = await getHomeById(id, scope);
    if (!target || target.conciergerieName !== session.rowKey) return null;
  }
  return await updateHome(id, { notes }, scope);
}

/**
 * Delete a home from the database
 */
export async function deleteHomeData(id: string): Promise<boolean> {
  const session = await requireConciergerieSession();
  if (!session) return false;
  const scope = tenantScope(session);
  const home = await getHomeById(id, scope);
  if (!home || home.conciergerieName !== session.rowKey) return false;
  return await deleteHome(id, scope);
}
