'use server';

import type {
  DbMissionReport} from '@/app/db/missionReportDb';
import {
  createMissionReport,
  getMissionReportByMissionId,
  getMissionReportsByMissionIds,
} from '@/app/db/missionReportDb';
import type { MissionReport } from '@/app/types/dataTypes';
import { generateSimpleId } from '@/app/utils/id';

/**
 * Save a mission report (free text + image paths) for a completed mission.
 */
export async function saveMissionReport(data: {
  missionId: string;
  employeeId: string;
  content: string;
  images: string[];
}): Promise<MissionReport | null> {
  const dbData: Omit<DbMissionReport, 'created_at'> = {
    id: generateSimpleId(),
    mission_id: data.missionId,
    employee_id: data.employeeId,
    content: data.content,
    images: data.images,
  };

  return await createMissionReport(dbData);
}

/**
 * Fetch the report for a single mission.
 */
export async function fetchMissionReport(missionId: string): Promise<MissionReport | null> {
  return await getMissionReportByMissionId(missionId);
}

/**
 * Fetch reports for multiple missions at once.
 */
export async function fetchMissionReports(missionIds: string[]): Promise<MissionReport[]> {
  return await getMissionReportsByMissionIds(missionIds);
}
