'use server';

import {
  DbMission,
  assignEmployeeToMission,
  createMission,
  deleteMission,
  getAllMissions,
  getAvailableMissionsForEmployee,
  getMissionById,
  getMissionsByConciergerieName,
  getMissionsByEmployeeId,
  getMissionsByHomeId,
  updateMission,
  updateMissionStatus,
} from '@/app/db/missionDb';
import { Mission, MissionStatus, Task } from '@/app/types/dataTypes';
import { revalidateTag } from 'next/cache';

/**
 * Fetch all missions from the database
 */
export async function fetchMissions(): Promise<Mission[]> {
  try {
    const missions = await getAllMissions();
    return missions;
  } catch (error) {
    console.error('Error fetching missions:', error);
    return [];
  }
}

/**
 * Fetch a single mission by ID
 */
export async function fetchMissionById(id: string): Promise<Mission | null> {
  try {
    const mission = await getMissionById(id);
    return mission;
  } catch (error) {
    console.error(`Error fetching mission with ID ${id}:`, error);
    return null;
  }
}

/**
 * Fetch missions by home ID
 */
export async function fetchMissionsByHomeId(homeId: string): Promise<Mission[]> {
  try {
    const missions = await getMissionsByHomeId(homeId);
    return missions;
  } catch (error) {
    console.error(`Error fetching missions for home ${homeId}:`, error);
    return [];
  }
}

/**
 * Fetch missions by conciergerie name
 */
export async function fetchMissionsByConciergerieName(conciergerieName: string): Promise<Mission[]> {
  try {
    const missions = await getMissionsByConciergerieName(conciergerieName);
    return missions;
  } catch (error) {
    console.error(`Error fetching missions for conciergerie ${conciergerieName}:`, error);
    return [];
  }
}

/**
 * Fetch missions by employee ID
 */
export async function fetchMissionsByEmployeeId(employeeId: string): Promise<Mission[]> {
  try {
    const missions = await getMissionsByEmployeeId(employeeId);
    return missions;
  } catch (error) {
    console.error(`Error fetching missions for employee ${employeeId}:`, error);
    return [];
  }
}

/**
 * Fetch available missions for an employee
 */
export async function fetchAvailableMissionsForEmployee(employeeId: string): Promise<Mission[]> {
  try {
    const missions = await getAvailableMissionsForEmployee(employeeId);
    return missions;
  } catch (error) {
    console.error(`Error fetching available missions for employee ${employeeId}:`, error);
    return [];
  }
}

/**
 * Create a new mission in the database
 */
export async function createNewMission(data: {
  id: string;
  homeId: string;
  tasks: Task[];
  startDateTime: Date;
  endDateTime: Date;
  employeeId?: string;
  conciergerieName: string;
  status?: MissionStatus;
  allowedEmployees?: string[];
  hours: number;
}): Promise<Mission | null> {
  try {
    // Convert to DB format
    const dbData: Omit<DbMission, 'modified_date'> = {
      id: data.id,
      home_id: data.homeId,
      tasks: data.tasks,
      start_date_time: data.startDateTime,
      end_date_time: data.endDateTime,
      employee_id: data.employeeId,
      conciergerie_name: data.conciergerieName,
      status: data.status || 'pending',
      allowed_employees: data.allowedEmployees,
      hours: data.hours,
    };

    const created = await createMission(dbData);

    if (!created) return null;

    // Revalidate cache after creation
    revalidateTag('missions');
    revalidateTag('missions_by_conciergerie');
    revalidateTag('missions_by_home');
    revalidateTag('missions_by_employee');

    return created;
  } catch (error) {
    console.error('Error creating mission:', error);
    return null;
  }
}

/**
 * Update a mission in the database
 */
export async function updateMissionData(
  id: string,
  data: Partial<{
    homeId: string;
    tasks: Task[];
    startDateTime: Date;
    endDateTime: Date;
    employeeId?: string;
    conciergerieName: string;
    status?: MissionStatus;
    allowedEmployees?: string[];
    hours: number;
  }>,
): Promise<Mission | null> {
  try {
    // Convert to DB format
    const dbData: Partial<Omit<DbMission, 'id' | 'modified_date'>> = {};

    if (data.homeId !== undefined) dbData.home_id = data.homeId;
    if (data.tasks !== undefined) dbData.tasks = data.tasks;
    if (data.startDateTime !== undefined) dbData.start_date_time = data.startDateTime;
    if (data.endDateTime !== undefined) dbData.end_date_time = data.endDateTime;
    if (data.employeeId !== undefined) dbData.employee_id = data.employeeId;
    if (data.conciergerieName !== undefined) dbData.conciergerie_name = data.conciergerieName;
    if (data.status !== undefined) dbData.status = data.status;
    if (data.allowedEmployees !== undefined) dbData.allowed_employees = data.allowedEmployees;
    if (data.hours !== undefined) dbData.hours = data.hours;

    const updated = await updateMission(id, dbData);

    if (!updated) return null;

    // Revalidate cache after update
    revalidateTag('missions');
    revalidateTag('missions_by_conciergerie');
    revalidateTag('missions_by_home');
    revalidateTag('missions_by_employee');
    revalidateTag('mission');

    return updated;
  } catch (error) {
    console.error(`Error updating mission with ID ${id}:`, error);
    return null;
  }
}

/**
 * Update mission status
 */
export async function updateMissionStatusAction(id: string, status: MissionStatus): Promise<Mission | null> {
  try {
    const updated = await updateMissionStatus(id, status);

    if (!updated) return null;

    // Revalidate cache after update
    revalidateTag('missions');
    revalidateTag('missions_by_conciergerie');
    revalidateTag('missions_by_home');
    revalidateTag('missions_by_employee');
    revalidateTag('mission');

    return updated;
  } catch (error) {
    console.error(`Error updating status for mission ${id}:`, error);
    return null;
  }
}

/**
 * Assign employee to mission
 */
export async function assignEmployeeToMissionAction(missionId: string, employeeId: string): Promise<Mission | null> {
  try {
    const updated = await assignEmployeeToMission(missionId, employeeId);

    if (!updated) return null;

    // Revalidate cache after update
    revalidateTag('missions');
    revalidateTag('missions_by_conciergerie');
    revalidateTag('missions_by_home');
    revalidateTag('missions_by_employee');
    revalidateTag('mission');

    return updated;
  } catch (error) {
    console.error(`Error assigning employee ${employeeId} to mission ${missionId}:`, error);
    return null;
  }
}

/**
 * Delete a mission from the database
 */
export async function deleteMissionData(id: string): Promise<boolean> {
  try {
    const deleted = await deleteMission(id);

    if (!deleted) return false;

    // Revalidate cache after deletion
    revalidateTag('missions');
    revalidateTag('missions_by_conciergerie');
    revalidateTag('missions_by_home');
    revalidateTag('missions_by_employee');

    return true;
  } catch (error) {
    console.error(`Error deleting mission with ID ${id}:`, error);
    return false;
  }
}
