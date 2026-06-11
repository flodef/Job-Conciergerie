import type { Home, Mission } from '@/app/types/dataTypes';
import { getMissionProviderCount } from './task';

/**
 * Get available months/years from missions
 * @param missions The list of missions to extract periods from
 * @returns An array of unique month/year strings, sorted in descending order
 */
export function getAvailableTimePeriods(missions: Mission[]): string[] {
  const periods = new Set<string>();

  missions.forEach(mission => {
    const date = new Date(mission.startDateTime);
    const month = date.toLocaleString('fr-FR', { month: 'long' });
    const year = date.getFullYear();
    const period = `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
    periods.add(period);
  });

  // Map French month names to numbers for proper sorting
  const frenchMonths: Record<string, number> = {
    Janvier: 0,
    Février: 1,
    Mars: 2,
    Avril: 3,
    Mai: 4,
    Juin: 5,
    Juillet: 6,
    Août: 7,
    Septembre: 8,
    Octobre: 9,
    Novembre: 10,
    Décembre: 11,
  };

  return Array.from(periods).sort((a, b) => {
    const [monthA, yearA] = a.split(' ');
    const [monthB, yearB] = b.split(' ');
    const dateA = new Date(parseInt(yearA), frenchMonths[monthA] || 0, 1);
    const dateB = new Date(parseInt(yearB), frenchMonths[monthB] || 0, 1);
    return dateB.getTime() - dateA.getTime(); // Sort descending (newest first)
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
 * @param employeeName The name of the employee to check
 * @returns true if the employee is part of the mission, false otherwise
 */
export const isPartOfMission = (mission: Mission, employeeName: string | undefined) =>
  employeeName && (mission.employeeId === employeeName || mission.employeeId2 === employeeName);

/**
 * Check if a mission is expired
 * @param mission The mission to check
 * @returns true if the mission is expired, false otherwise
 */
export const isMissionExpired = (mission: Mission) => new Date(mission.endDateTime) < new Date();

/**
 * Filter missions based on user type
 * @param missions The list of missions to filter
 * @param employeeName The name of the employee (if any)
 * @returns The filtered list of missions
 */
export function filterMissionsByUserType(missions: Mission[], employeeName: string | undefined): Mission[] {
  return missions.filter(mission => {
    // For employee users, show only missions they have access to
    if (employeeName) {
      // If the mission has prestataires specified, check if the current employee is in the list
      if (mission.allowedEmployees?.length) return mission.allowedEmployees.includes(employeeName);

      // Missions the employee is already part of (either binôme slot)
      if (isPartOfMission(mission, employeeName)) return true;

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
 * @param employeeName The name of the employee (if any)
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
  employeeName?: string,
  selectedEmployees: string[] = [],
): Mission[] {
  return missions.filter(mission => {
    // Filter by conciergerie
    if (selectedConciergeries.length > 0 && !selectedConciergeries.includes(mission.conciergerieName)) return false;

    // Filter by time period (month/year)
    if (selectedStatuses.length > 0) {
      const missionDate = new Date(mission.startDateTime);
      const missionMonth = missionDate.toLocaleString('fr-FR', { month: 'long' });
      const missionYear = missionDate.getFullYear();
      const missionPeriod = `${missionMonth.charAt(0).toUpperCase() + missionMonth.slice(1)} ${missionYear}`;

      const matchesTimeStatus = selectedStatuses.includes(missionPeriod);

      if (!matchesTimeStatus) return false;
    }

    // Filter by mission status (skip if employee filter is active — shows all their missions)
    if (selectedMissionStatuses.length > 0 && selectedEmployees.length === 0) {
      // Check if the mission matches the selected status filter
      // 'available' means no employee is assigned (employeeId is empty) OR duo-open (1/2) AND mission is not in the past
      // AND the current employee is not already assigned to either slot
      // 'accepted', 'started', 'completed' match the actual mission status
      // 'expired' means null status AND mission is expired
      const isAvailable =
        (!mission.employeeId || (isMissionDuoOpen(mission) && !isPartOfMission(mission, employeeName))) &&
        !isMissionExpired(mission);
      const isAccepted = mission.status === 'accepted' && (!employeeName || isPartOfMission(mission, employeeName));
      const isStarted = mission.status === 'started';
      const isCompleted = mission.status === 'completed' && (!employeeName || isPartOfMission(mission, employeeName));
      const isExpired = !mission.status && isMissionExpired(mission);

      const matchesMissionStatus =
        (selectedMissionStatuses.includes('available') && isAvailable) ||
        (selectedMissionStatuses.includes('accepted') && isAccepted) ||
        (selectedMissionStatuses.includes('started') && isStarted) ||
        (selectedMissionStatuses.includes('completed') && isCompleted) ||
        (selectedMissionStatuses.includes('expired') && isExpired);

      if (!matchesMissionStatus) return false;
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
      const dateA = new Date(a.startDateTime).getTime();
      const dateB = new Date(b.startDateTime).getTime();
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
      const date = new Date(mission.startDateTime);
      const month = date.toLocaleString('fr-FR', { month: 'long' });
      const year = date.getFullYear();
      category = `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
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
