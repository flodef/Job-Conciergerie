import { sql } from '@/app/db/db';
import { Mission, MissionStatus, Task } from '@/app/types/dataTypes';
import postgres from 'postgres';

// Type definition for database mission
export interface DbMission {
  id: string;
  home_id: string;
  tasks: Task[];
  start_date_time: Date;
  end_date_time: Date;
  employee_id: string | null;
  modified_date: Date;
  conciergerie_name: string;
  status: MissionStatus | null;
  allowed_employees?: string[] | null;
  hours: number;
}

/**
 * Format a database mission to match the application's expected format
 */
function formatMission(dbMission: DbMission): Mission {
  return {
    id: dbMission.id,
    homeId: dbMission.home_id,
    tasks: dbMission.tasks,
    startDateTime: dbMission.start_date_time,
    endDateTime: dbMission.end_date_time,
    employeeId: dbMission.employee_id,
    modifiedDate: dbMission.modified_date,
    conciergerieName: dbMission.conciergerie_name,
    status: dbMission.status,
    allowedEmployees: dbMission.allowed_employees,
    hours: Number(dbMission.hours),
  };
}

/**
 * Fetch all missions
 */
export const getAllMissions = async () => {
  try {
    const result = await sql`
      SELECT id, home_id, tasks, start_date_time, end_date_time, employee_id, modified_date, conciergerie_name, status, allowed_employees, hours
      FROM missions
      ORDER BY start_date_time ASC
    `;

    return result.map(row => formatMission(row as DbMission));
  } catch (error) {
    console.error('Error fetching missions:', error);
    return null;
  }
};

/**
 * Fetch a single mission by ID
 */
export const getMissionById = async (id: string) => {
  try {
    const result = await sql`
      SELECT id, home_id, tasks, start_date_time, end_date_time, employee_id, modified_date, conciergerie_name, status, allowed_employees, hours
      FROM missions
      WHERE id = ${id}
    `;

    return result.length > 0 ? formatMission(result[0] as DbMission) : null;
  } catch (error) {
    console.error(`Error fetching mission with ID ${id}:`, error);
    return null;
  }
};

/**
 * Get missions by home ID
 */
export const getMissionsByHomeId = async (homeId: string) => {
  try {
    const result = await sql`
      SELECT id, home_id, tasks, start_date_time, end_date_time, employee_id, modified_date, conciergerie_name, status, allowed_employees, hours
      FROM missions
      WHERE home_id = ${homeId}
      ORDER BY start_date_time ASC
    `;

    return result.map(row => formatMission(row as DbMission));
  } catch (error) {
    console.error(`Error fetching missions for home ${homeId}:`, error);
    return [];
  }
};

/**
 * Get missions by conciergerie name
 */
export const getMissionsByConciergerieName = async (conciergerieName: string) => {
  try {
    const result = await sql`
      SELECT id, home_id, tasks, start_date_time, end_date_time, employee_id, modified_date, conciergerie_name, status, allowed_employees, hours
      FROM missions
      WHERE conciergerie_name = ${conciergerieName}
      ORDER BY start_date_time ASC
    `;

    return result.map(row => formatMission(row as DbMission));
  } catch (error) {
    console.error(`Error fetching missions for conciergerie ${conciergerieName}:`, error);
    return [];
  }
};

/**
 * Get missions by employee ID
 */
export const getMissionsByEmployeeId = async (employeeId: string) => {
  try {
    const result = await sql`
      SELECT id, home_id, tasks, start_date_time, end_date_time, employee_id, modified_date, conciergerie_name, status, allowed_employees, hours
      FROM missions
      WHERE employee_id = ${employeeId}
      ORDER BY start_date_time ASC
    `;

    return result.map(row => formatMission(row as DbMission));
  } catch (error) {
    console.error(`Error fetching missions for employee ${employeeId}:`, error);
    return [];
  }
};

/**
 * Get available missions for an employee
 * (missions without an assigned employee or with this employee assigned)
 */
export const getAvailableMissionsForEmployee = async (employeeId: string) => {
  try {
    const result = await sql`
      SELECT id, home_id, tasks, start_date_time, end_date_time, employee_id, modified_date, conciergerie_name, status, allowed_employees, hours
      FROM missions
      WHERE 
        (employee_id IS NULL OR employee_id = ${employeeId})
        AND (
          allowed_employees IS NULL 
          OR allowed_employees = '[]'
          OR allowed_employees @> ${[employeeId]}
        )
      ORDER BY start_date_time ASC
    `;

    return result.map(row => formatMission(row as DbMission));
  } catch (error) {
    console.error(`Error fetching available missions for employee ${employeeId}:`, error);
    return [];
  }
};

/**
 * Create a new mission
 */
export const createMission = async (data: Omit<DbMission, 'modified_date'>) => {
  try {
    const result = await sql`
      INSERT INTO missions (
        id, home_id, tasks, start_date_time, end_date_time, employee_id, conciergerie_name, status, allowed_employees, hours
      ) VALUES (
        ${data.id}, ${data.home_id}, ${data.tasks}, ${data.start_date_time}, ${data.end_date_time},
        ${data.employee_id || null}, ${data.conciergerie_name ?? null}, ${data.status ?? null},
        ${data.allowed_employees ?? null}, ${typeof data.hours === 'string' ? parseFloat(data.hours) : data.hours}
      )
      RETURNING id, home_id, tasks, start_date_time, end_date_time, employee_id, modified_date, conciergerie_name, status, allowed_employees, hours
    `;

    return result.length > 0 ? formatMission(result[0] as DbMission) : null;
  } catch (error) {
    console.error('Error creating mission:', error);
    return null;
  }
};

/**
 * Update a mission
 */
export const updateMission = async (id: string, data: Partial<Omit<DbMission, 'id' | 'modified_date'>>) => {
  try {
    // Build update parts and corresponding values
    const parts: string[] = [];
    const values: unknown[] = [];

    const addField = (field: string, value: unknown, cast?: string) => {
      values.push(value);
      parts.push(`${field} = $${values.length}${cast ? `::${cast}` : ''}`);
    };

    if (data.home_id !== undefined) addField('home_id', data.home_id, 'text');
    if (data.tasks !== undefined) addField('tasks', data.tasks, 'text[]');
    if (data.start_date_time !== undefined)
      addField('start_date_time', new Date(data.start_date_time).toISOString(), 'timestamptz');
    if (data.end_date_time !== undefined) {
      addField('end_date_time', new Date(data.end_date_time).toISOString(), 'timestamptz');
      // Reset the late notification flag so a rescheduled mission can be re-notified if it becomes late again
      parts.push('late_notified_at = NULL');
    }
    if (data.employee_id !== undefined) {
      if (data.employee_id === null) parts.push('employee_id = NULL');
      else addField('employee_id', data.employee_id, 'text');
    }
    if (data.conciergerie_name !== undefined) addField('conciergerie_name', data.conciergerie_name, 'text');
    if (data.status !== undefined) {
      if (data.status === null) parts.push('status = NULL');
      else addField('status', data.status, 'text');
    }
    if (data.allowed_employees !== undefined) {
      if (data.allowed_employees === null) parts.push('allowed_employees = NULL');
      else addField('allowed_employees', data.allowed_employees, 'text[]');
    }
    if (data.hours !== undefined) addField('hours', String(data.hours), 'numeric');

    if (parts.length === 0) return null; // Nothing to update

    // Add id as the last parameter
    values.push(id);

    const query = `
      UPDATE missions
      SET ${parts.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, home_id, tasks, start_date_time, end_date_time, employee_id, modified_date, conciergerie_name, status, allowed_employees, hours
    `;

    const result = await sql.unsafe(query, values as postgres.ParameterOrJSON<never>[]);

    return result.length > 0 ? formatMission(result[0] as unknown as DbMission) : null;
  } catch (error) {
    console.error(`Error updating mission with ID ${id}:`, error);
    return null;
  }
};

/**
 * Update mission status
 */
export const updateMissionStatus = async (id: string, status: MissionStatus) => {
  try {
    const result = await sql`
      UPDATE missions
      SET status = ${status}, modified_date = NOW()
      WHERE id = ${id}
      RETURNING id, home_id, tasks, start_date_time, end_date_time, employee_id, modified_date, conciergerie_name, status, allowed_employees, hours
    `;

    return result.length > 0 ? formatMission(result[0] as DbMission) : null;
  } catch (error) {
    console.error(`Error updating status for mission ${id}:`, error);
    return null;
  }
};

/**
 * Assign employee to mission
 */
export const assignEmployeeToMission = async (missionId: string, employeeId: string) => {
  try {
    const result = await sql`
      UPDATE missions
      SET employee_id = ${employeeId}, modified_date = NOW()
      WHERE id = ${missionId}
      RETURNING id, home_id, tasks, start_date_time, end_date_time, employee_id, modified_date, conciergerie_name, status, allowed_employees, hours
    `;

    return result.length > 0 ? formatMission(result[0] as DbMission) : null;
  } catch (error) {
    console.error(`Error assigning employee ${employeeId} to mission ${missionId}:`, error);
    return null;
  }
};

/**
 * Atomically claim the "late notification" slot for a mission.
 * Returns true only the first time it is called for a given mission id;
 * any subsequent call returns false because `late_notified_at` is no longer NULL.
 * This prevents duplicate "mission non terminée à temps" emails when several
 * users (or background jobs) fetch missions concurrently.
 */
export const claimLateNotification = async (id: string): Promise<boolean> => {
  try {
    const result = await sql`
      UPDATE missions
      SET late_notified_at = NOW()
      WHERE id = ${id} AND late_notified_at IS NULL
      RETURNING id
    `;
    return result.length > 0;
  } catch (error) {
    console.error(`Error claiming late notification for mission ${id}:`, error);
    return false;
  }
};

/**
 * Delete a mission
 */
export const deleteMission = async (id: string) => {
  try {
    const result = await sql`
      DELETE FROM missions
      WHERE id = ${id}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    console.error(`Error deleting mission with ID ${id}:`, error);
    return false;
  }
};
