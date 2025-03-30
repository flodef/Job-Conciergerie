'use server';

import {
  DbMission,
  assignEmployeeToMission,
  createMission,
  deleteMission,
  getAllMissions,
  updateMission,
  updateMissionStatus,
} from '@/app/db/missionDb';
import { Mission, MissionStatus, Task } from '@/app/types/dataTypes';

/**
 * Fetch all missions from the database
 */
export async function fetchAllMissions(): Promise<Mission[] | null> {
  return await getAllMissions();
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

  return await createMission(dbData);
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

  return await updateMission(id, dbData);
}

/**
 * Update mission status
 */
export async function updateMissionStatusAction(id: string, status: MissionStatus): Promise<Mission | null> {
  return await updateMissionStatus(id, status);
}

/**
 * Assign employee to mission
 */
export async function assignEmployeeToMissionAction(missionId: string, employeeId: string): Promise<Mission | null> {
  return await assignEmployeeToMission(missionId, employeeId);
}

/**
 * Delete a mission from the database
 */
export async function deleteMissionData(id: string): Promise<boolean> {
  return await deleteMission(id);
}
