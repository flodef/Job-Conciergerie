'use server';

import type { DbMission } from '@/app/db/missionDb';
import {
  assignEmployeeToMission,
  claimLateNotification,
  createMission,
  deleteMission,
  getAllMissions,
  getMissionById,
  updateMission,
  updateMissionStatus,
} from '@/app/db/missionDb';
import { requireConciergerieSession, requireConnectedSession, type SessionUser } from '@/app/db/session';
import type { Mission, MissionStatus } from '@/app/types/dataTypes';

/**
 * Per-mission authorization:
 * - a conciergerie only manages missions of its own tenant (`conciergerie_name`);
 * - an employee only touches missions they are assigned to (first or second binôme).
 */
const canAccessMission = (session: SessionUser, mission: Mission): boolean =>
  session.userType === 'conciergerie'
    ? !mission.conciergerieName || mission.conciergerieName === session.rowKey
    : mission.employeeId === session.rowKey || mission.employeeId2 === session.rowKey;

/**
 * Fetch all missions from the database
 */
export async function fetchAllMissions(): Promise<Mission[] | null> {
  if (!(await requireConnectedSession())) return null;
  return await getAllMissions();
}

/**
 * Create a new mission in the database
 */
export async function createNewMission(data: Mission): Promise<Mission | null> {
  const session = await requireConciergerieSession();
  // A conciergerie only creates missions in its own tenant
  if (!session || data.conciergerieName !== session.rowKey) return null;

  // Convert to DB format
  const dbData: Omit<DbMission, 'modified_date'> = {
    id: data.id,
    home_id: data.homeId,
    tasks: data.tasks,
    start_date_time: data.startDateTime,
    end_date_time: data.endDateTime,
    employee_id: data.employeeId,
    employee_id_2: data.employeeId2 ?? null,
    conciergerie_name: data.conciergerieName,
    status: data.status,
    allowed_employees: data.allowedEmployees,
    hours: data.hours,
    allow_duo: data.allowDuo ?? false,
    travellers: data.travellers ?? 1,
    conciergerie_comment: data.conciergerieComment,
  };

  return await createMission(dbData);
}

/**
 * Update a mission in the database.
 * Conciergeries edit their own missions freely; employees only update the
 * assignment/status fields of missions they are assigned to (or claim an open
 * mission / join an open duo as themselves).
 */
export async function updateMissionData(id: string, data: Partial<Mission>): Promise<Mission | null> {
  const session = await requireConnectedSession();
  if (!session) return null;

  const mission = await getMissionById(id);
  if (!mission) return null;

  // Convert to DB format
  const dbData: Partial<Omit<DbMission, 'id' | 'modified_date'>> = {};

  if (data.homeId !== undefined) dbData.home_id = data.homeId;
  if (data.tasks !== undefined) dbData.tasks = data.tasks;
  if (data.startDateTime !== undefined) dbData.start_date_time = data.startDateTime;
  if (data.endDateTime !== undefined) dbData.end_date_time = data.endDateTime;
  if (data.employeeId !== undefined) dbData.employee_id = data.employeeId;
  if (data.employeeId2 !== undefined) dbData.employee_id_2 = data.employeeId2;
  if (data.conciergerieName !== undefined) dbData.conciergerie_name = data.conciergerieName;
  if (data.status !== undefined) dbData.status = data.status;
  if (data.allowedEmployees !== undefined) dbData.allowed_employees = data.allowedEmployees;
  if (data.hours !== undefined) dbData.hours = data.hours;
  if (data.allowDuo !== undefined) dbData.allow_duo = data.allowDuo;
  if (data.travellers !== undefined) dbData.travellers = data.travellers;
  if (data.conciergerieComment !== undefined) dbData.conciergerie_comment = data.conciergerieComment;

  if (session.userType === 'conciergerie') {
    if (!canAccessMission(session, mission)) return null;
    return await updateMission(id, dbData);
  }

  const mine = canAccessMission(session, mission);
  const claiming = !mission.employeeId && data.employeeId === session.rowKey;
  const joiningDuo = !!mission.employeeId && !mission.employeeId2 && data.employeeId2 === session.rowKey;
  if (!mine && !claiming && !joiningDuo) return null;

  // Restricted missions can only be claimed by allowed employees
  if (
    (claiming || joiningDuo) &&
    mission.allowedEmployees?.length &&
    !mission.allowedEmployees.includes(session.rowKey)
  )
    return null;

  // An employee can only (un)assign themselves — never another person
  if (data.employeeId != null && data.employeeId !== session.rowKey) return null;
  if (data.employeeId2 != null && data.employeeId2 !== session.rowKey) return null;

  const filtered: Partial<Omit<DbMission, 'id' | 'modified_date'>> = {};
  if (dbData.employee_id !== undefined) filtered.employee_id = dbData.employee_id;
  if (dbData.employee_id_2 !== undefined) filtered.employee_id_2 = dbData.employee_id_2;
  if (dbData.status !== undefined) filtered.status = dbData.status;
  if (Object.keys(filtered).length === 0) return null;

  return await updateMission(id, filtered);
}

/**
 * Update mission status
 */
export async function updateMissionStatusAction(id: string, status: MissionStatus): Promise<Mission | null> {
  const session = await requireConnectedSession();
  if (!session) return null;
  const mission = await getMissionById(id);
  if (!mission || !canAccessMission(session, mission)) return null;
  return await updateMissionStatus(id, status);
}

/**
 * Assign employee to mission
 */
export async function assignEmployeeToMissionAction(missionId: string, employeeId: string): Promise<Mission | null> {
  const session = await requireConciergerieSession();
  if (!session) return null;
  const mission = await getMissionById(missionId);
  if (!mission || !canAccessMission(session, mission)) return null;
  return await assignEmployeeToMission(missionId, employeeId);
}

/**
 * Delete a mission from the database
 */
export async function deleteMissionData(id: string): Promise<boolean> {
  const session = await requireConciergerieSession();
  if (!session) return false;
  const mission = await getMissionById(id);
  if (!mission || !canAccessMission(session, mission)) return false;
  return await deleteMission(id);
}

/**
 * Atomically claim the right to send the "mission non terminée à temps" email.
 * Returns true ONLY the first time it is called for a given mission;
 * any subsequent call returns false. Use this to guarantee the email is sent at most once.
 */
export async function claimLateNotificationForMission(missionId: string): Promise<boolean> {
  const session = await requireConnectedSession();
  if (!session) return false;
  const mission = await getMissionById(missionId);
  if (!mission || !canAccessMission(session, mission)) return false;
  return await claimLateNotification(missionId);
}
