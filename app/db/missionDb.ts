import { sql } from '@/app/db/db';
import { Mission, MissionStatus, Task } from '@/app/types/dataTypes';

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
        ${data.employee_id || null}, ${data.conciergerie_name}, ${data.status}, 
        ${data.allowed_employees}, ${data.hours}
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
    // Prepare update fields
    const fields = [];
    const values = [];

    if (data.home_id !== undefined) {
      fields.push(`home_id = $${values.length + 1}`);
      values.push(data.home_id);
    }
    if (data.tasks !== undefined) {
      fields.push(`tasks = $${values.length + 1}`);
      values.push(data.tasks);
    }
    if (data.start_date_time !== undefined) {
      fields.push(`start_date_time = $${values.length + 1}`);
      values.push(data.start_date_time);
    }
    if (data.end_date_time !== undefined) {
      fields.push(`end_date_time = $${values.length + 1}`);
      values.push(data.end_date_time);
    }
    if (data.employee_id !== undefined) {
      fields.push(`employee_id = $${values.length + 1}`);
      values.push(data.employee_id === null ? null : data.employee_id);
    }
    if (data.conciergerie_name !== undefined) {
      fields.push(`conciergerie_name = $${values.length + 1}`);
      values.push(data.conciergerie_name);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${values.length + 1}`);
      values.push(data.status);
    }
    if (data.allowed_employees !== undefined) {
      fields.push(`allowed_employees = $${values.length + 1}`);
      values.push(data.allowed_employees);
    }
    if (data.hours !== undefined) {
      fields.push(`hours = $${values.length + 1}`);
      values.push(data.hours);
    }

    if (fields.length === 0) return null; // Nothing to update

    // Build and execute query
    const query = `
      UPDATE missions 
      SET ${fields.join(', ')} 
      WHERE id = $${values.length + 1}
      RETURNING id, home_id, tasks, start_date_time, end_date_time, employee_id, modified_date, conciergerie_name, status, allowed_employees, hours`;
    values.push(id);

    const result = await sql.query(query, values);

    return result.length > 0 ? formatMission(result[0] as DbMission) : null;
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
