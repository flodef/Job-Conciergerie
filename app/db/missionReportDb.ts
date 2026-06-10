import { sql } from '@/app/db/db';
import type { MissionReport } from '@/app/types/dataTypes';

// Type definition for database mission report
export interface DbMissionReport {
  id: string;
  mission_id: string;
  employee_id: string;
  content: string;
  images: string[];
  created_at: Date;
}

/**
 * Format a database mission report to match the application's expected format
 */
function formatMissionReport(dbReport: DbMissionReport): MissionReport {
  return {
    id: dbReport.id,
    missionId: dbReport.mission_id,
    employeeId: dbReport.employee_id,
    content: dbReport.content,
    images: dbReport.images ?? [],
    createdAt: dbReport.created_at,
  };
}

/**
 * Create a new mission report
 */
export const createMissionReport = async (
  data: Omit<DbMissionReport, 'created_at'>,
): Promise<MissionReport | null> => {
  try {
    const result = await sql`
      INSERT INTO mission_reports (id, mission_id, employee_id, content, images)
      VALUES (${data.id}, ${data.mission_id}, ${data.employee_id}, ${data.content}, ${data.images})
      RETURNING id, mission_id, employee_id, content, images, created_at
    `;

    return result.length > 0 ? formatMissionReport(result[0] as DbMissionReport) : null;
  } catch (error) {
    console.error('Error creating mission report:', error);
    return null;
  }
};

/**
 * Get the report for a given mission (most recent first)
 */
export const getMissionReportByMissionId = async (missionId: string): Promise<MissionReport | null> => {
  try {
    const result = await sql`
      SELECT id, mission_id, employee_id, content, images, created_at
      FROM mission_reports
      WHERE mission_id = ${missionId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    return result.length > 0 ? formatMissionReport(result[0] as DbMissionReport) : null;
  } catch (error) {
    console.error(`Error fetching mission report for mission ${missionId}:`, error);
    return null;
  }
};

/**
 * Get all mission reports for a list of mission IDs
 */
export const getMissionReportsByMissionIds = async (missionIds: string[]): Promise<MissionReport[]> => {
  if (missionIds.length === 0) return [];
  try {
    const result = await sql`
      SELECT id, mission_id, employee_id, content, images, created_at
      FROM mission_reports
      WHERE mission_id = ANY(${missionIds})
      ORDER BY created_at DESC
    `;

    return result.map(row => formatMissionReport(row as DbMissionReport));
  } catch (error) {
    console.error('Error fetching mission reports:', error);
    return [];
  }
};
