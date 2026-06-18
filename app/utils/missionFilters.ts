import type { Home, Mission } from '@/app/types/dataTypes';
import { frenchMonths, getMonthYearFromDate } from './date';
import { getMissionProviderCount } from './task';

/**
 * Get available months/years from missions
 * @param missions The list of missions to extract periods from
 * @param sortDirection The sort direction ('asc' or 'desc')
 * @returns An array of unique month/year strings, sorted according to sortDirection
 */
export function getAvailableTimePeriods(missions: Mission[], sortDirection: 'asc' | 'desc' = 'desc'): string[] {
  const periods = new Set<string>();

  missions.forEach(mission => {
    periods.add(getMonthYearFromDate(mission.startDateTime));
  });

  return Array.from(periods).sort((a, b) => {
    const [monthA, yearA] = a.split(' ');
    const [monthB, yearB] = b.split(' ');
    const dateA = new Date(parseInt(yearA), frenchMonths[monthA] || 0, 1);
    const dateB = new Date(parseInt(yearB), frenchMonths[monthB] || 0, 1);
    const comparison = dateA.getTime() - dateB.getTime();
    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

/**
 * Whether a mission is "duo-open": the first binôme slot is filled but the second
 * is still free, the home allows duos, and the mission is not finished. Such a
 * mission stays visible to other providers so a second one can join.
 * @param mission The mission to check
 * @returns true if the mission is duo-open, false otherwise
 */
export const isMissionDuoOpen = (mission: Mission) =>
  mission.allowDuo &&
  !isMissionExpired(mission) &&
  mission.status !== 'completed' &&
  getMissionProviderCount(mission) < 2;

/**
 * Check if an employee is part of a mission (either as first or second provider)
 * @param mission The mission to check
 * @param employeeId The id of the employee to check
 * @returns true if the employee is part of the mission, false otherwise
 */
export const isPartOfMission = (mission: Mission, employeeId: string | undefined) =>
  employeeId && (mission.employeeId === employeeId || mission.employeeId2 === employeeId);

/**
 * Check if a mission is expired
 * @param mission The mission to check
 * @returns true if the mission is expired, false otherwise
 */
export const isMissionExpired = (mission: Mission) => mission.endDateTime < new Date();

/**
 * Check if a mission is editable
 * @param mission The mission to check
 * @returns true if the mission is editable, false otherwise
 */
export const isMissionEditable = (mission: Mission) => mission.status !== 'started' && mission.status !== 'completed';

/**
 * Get the status of a mission for filtering purposes
 * @param mission The mission to check
 * @param employeeId The id of the employee (if any)
 * @returns The mission status: 'available', 'accepted', 'started', 'completed', or 'expired'
 */
export const getMissionStatus = (
  mission: Mission,
  employeeId?: string,
): 'available' | 'accepted' | 'started' | 'completed' | 'expired' => {
  const canSeeMission = !employeeId || isPartOfMission(mission, employeeId);
  const isAvailable =
    (!mission.employeeId || (isMissionDuoOpen(mission) && !isPartOfMission(mission, employeeId))) &&
    !isMissionExpired(mission) &&
    mission.status !== 'completed';
  const isAccepted = mission.status === 'accepted' && canSeeMission;
  const isStarted = mission.status === 'started' && canSeeMission;
  const isCompleted = mission.status === 'completed' && canSeeMission;
  const isExpired = !mission.status && isMissionExpired(mission);

  if (isAvailable) return 'available';
  if (isAccepted) return 'accepted';
  if (isStarted) return 'started';
  if (isCompleted) return 'completed';
  if (isExpired) return 'expired';
  return 'available';
};

/**
 * Get available mission statuses from missions
 * @param missions The list of missions to extract statuses from
 * @param employeeId The id of the employee (if any)
 * @returns An array of unique mission status strings
 */
export function getAvailableMissionStatuses(missions: Mission[], employeeId?: string): string[] {
  const statuses = new Set<string>();
  missions.forEach(mission => {
    statuses.add(getMissionStatus(mission, employeeId));
  });
  return Array.from(statuses);
}

/**
 * Filter missions based on user type
 * @param missions The list of missions to filter
 * @param employeeId The name of the employee (if any)
 * @returns The filtered list of missions
 */
export function filterMissionsByUserType(missions: Mission[], employeeId: string | undefined): Mission[] {
  return missions.filter(mission => {
    // For employee users, show only missions they have access to
    if (employeeId) {
      // If the mission has prestataires specified, check if the current employee is in the list
      if (mission.allowedEmployees?.length) return mission.allowedEmployees.includes(employeeId);

      // Missions the employee is already part of (either binôme slot)
      if (isPartOfMission(mission, employeeId)) return true;

      // Mission assigned to someone else: only visible if it's duo-open (so they can join as 2nd)
      if (mission.employeeId) return isMissionDuoOpen(mission);

      // Unassigned mission: visible while not in the past
      return !isMissionExpired(mission);
    }

    // For conciergerie users, show all the missions
    return true;
  });
}

/**
 * Apply additional filters (conciergerie, status, zones)
 * @param missions The list of missions to filter
 * @param selectedConciergeries The selected conciergerie IDs
 * @param selectedStatuses The selected status IDs
 * @param selectedMissionStatuses The selected mission status IDs
 * @param selectedZones The selected zone IDs
 * @param homes The list of homes
 * @param employeeId The id of the employee (if any)
 * @param selectedEmployees The selected employee names
 * @returns The filtered list of missions
 */
export function applyMissionFilters(
  missions: Mission[],
  selectedConciergeries: string[],
  selectedStatuses: string[],
  selectedMissionStatuses: string[],
  selectedZones: string[],
  homes: Home[],
  employeeId?: string,
  selectedEmployees: string[] = [],
): Mission[] {
  return missions.filter(mission => {
    // Filter by conciergerie
    if (selectedConciergeries.length > 0 && !selectedConciergeries.includes(mission.conciergerieName)) return false;

    // Filter by time period (month/year)
    if (selectedStatuses.length > 0) {
      const missionPeriod = getMonthYearFromDate(mission.startDateTime);

      if (!selectedStatuses.includes(missionPeriod)) return false;
    }

    // Filter by mission status (skip if employee filter is active — shows all their missions)
    if (selectedMissionStatuses.length > 0 && selectedEmployees.length === 0) {
      const missionStatus = getMissionStatus(mission, employeeId);
      if (!selectedMissionStatuses.includes(missionStatus)) return false;
    }

    // Filter by geographic zones
    if (selectedZones.length > 0) {
      const home = homes.find(h => h.id === mission.homeId);
      if (!home?.geographicZone || !selectedZones.includes(home.geographicZone)) {
        return false;
      }
    }

    // Filter by employee (matches either binôme slot)
    if (selectedEmployees.length > 0) {
      if (
        (!mission.employeeId || !selectedEmployees.includes(mission.employeeId)) &&
        (!mission.employeeId2 || !selectedEmployees.includes(mission.employeeId2))
      )
        return false;
    }

    return true;
  });
}

/**
 * Sort missions by the specified field and direction
 * @param missions The list of missions to sort
 * @param sortField The field to sort by
 * @param sortDirection The direction to sort (asc or desc)
 * @param homes The list of homes to use for sorting
 * @returns The sorted list of missions
 */
export function sortMissions(
  missions: Mission[],
  sortField: 'date' | 'conciergerie' | 'geographicZone' | 'homeTitle',
  sortDirection: 'asc' | 'desc',
  homes: Home[],
): Mission[] {
  return [...missions].sort((a, b) => {
    let comparison = 0;

    if (sortField === 'date') {
      const dateA = a.startDateTime.getTime();
      const dateB = b.startDateTime.getTime();
      comparison = dateA - dateB;
    } else if (sortField === 'conciergerie') {
      comparison = a.conciergerieName.localeCompare(b.conciergerieName);
    } else if (sortField === 'geographicZone') {
      const homeA = homes.find(h => h.id === a.homeId);
      const homeB = homes.find(h => h.id === b.homeId);
      const zoneA = homeA?.geographicZone || '';
      const zoneB = homeB?.geographicZone || '';
      comparison = zoneA.localeCompare(zoneB);
    } else if (sortField === 'homeTitle') {
      const homeA = homes.find(h => h.id === a.homeId);
      const homeB = homes.find(h => h.id === b.homeId);
      const titleA = homeA?.title || '';
      const titleB = homeB?.title || '';
      comparison = titleA.localeCompare(titleB);
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

/**
 * Group missions by category based on sort field
 * @param missions The list of missions to group
 * @param sortField The field to group by
 * @param homes The list of homes to use for grouping
 * @returns An object with categories as keys and arrays of missions as values
 */
export function groupMissionsByCategory(
  missions: Mission[],
  sortField: 'date' | 'conciergerie' | 'geographicZone' | 'homeTitle',
  homes: Home[],
): Record<string, Mission[]> {
  const grouped: Record<string, Mission[]> = {};

  missions.forEach(mission => {
    let category = '';

    if (sortField === 'date') {
      category = getMonthYearFromDate(mission.startDateTime);
    } else if (sortField === 'conciergerie') {
      category = mission.conciergerieName;
    } else if (sortField === 'geographicZone') {
      const home = homes.find(h => h.id === mission.homeId);
      category = home?.geographicZone || 'Zone inconnue';
    } else if (sortField === 'homeTitle') {
      const home = homes.find(h => h.id === mission.homeId);
      category = home?.title || 'Bien non trouvé';
    }

    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(mission);
  });

  return grouped;
}
