'use server';

import type { DbMissionReport } from '@/app/db/missionReportDb';
import {
  createMissionReport,
  getMissionReportByMissionId,
  getMissionReportsByMissionIds,
} from '@/app/db/missionReportDb';
import { PLAN_LIMITS } from '@/app/data/plans';
import { getMissionById } from '@/app/db/missionDb';
import { getConciergeriePlan } from '@/app/db/planDb';
import { requireConnectedSession, tenantScope } from '@/app/db/session';
import type { MissionReport } from '@/app/types/dataTypes';
import { generateSecureId } from '@/app/utils/id';

/**
 * Save a mission report (free text + image paths) for a completed mission.
 * Only the assigned employee(s) may report on a mission, and the author is
 * taken from the session — never from the client-passed employeeId.
 */
export async function saveMissionReport(data: {
  missionId: string;
  employeeId: string;
  content: string;
  images: string[];
}): Promise<MissionReport | null> {
  const session = await requireConnectedSession();
  if (!session) return null;

  const scope = tenantScope(session);
  const mission = await getMissionById(data.missionId, scope);
  if (!mission || (mission.employeeId !== session.rowKey && mission.employeeId2 !== session.rowKey)) return null;
  if (!PLAN_LIMITS[await getConciergeriePlan(mission.conciergerieName)].missionReports) return null;

  const dbData: Omit<DbMissionReport, 'created_at'> = {
    id: generateSecureId(),
    mission_id: data.missionId,
    employee_id: session.rowKey,
    content: data.content,
    images: data.images,
    client_id: session.clientId,
  };

  return await createMissionReport(dbData);
}

/**
 * Fetch the report for a single mission.
 */
export async function fetchMissionReport(missionId: string): Promise<MissionReport | null> {
  const session = await requireConnectedSession();
  if (!session) return null;
  return await getMissionReportByMissionId(missionId, tenantScope(session));
}

/**
 * Fetch reports for multiple missions at once.
 */
export async function fetchMissionReports(missionIds: string[]): Promise<MissionReport[]> {
  const session = await requireConnectedSession();
  if (!session) return [];
  return await getMissionReportsByMissionIds(missionIds, tenantScope(session));
}
