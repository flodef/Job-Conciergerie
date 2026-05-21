import { Home, Mission } from '@/app/types/dataTypes';

/**
 * Get available months/years from missions
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
 * Filter missions based on user type
 */
export function filterMissionsByUserType(missions: Mission[], employeeName: string | undefined): Mission[] {
  return missions.filter(mission => {
    // For employee users, show only missions they have access to
    if (employeeName) {
      // If the mission has prestataires specified, check if the current employee is in the list
      if (mission.allowedEmployees?.length) return mission.allowedEmployees.includes(employeeName);

      if (mission.employeeId) return mission.employeeId === employeeName;
      else return new Date(mission.endDateTime) >= new Date();

      // If no prestataires specified, show to all
      return true;
    }

    // For conciergerie users, show all the missions
    return true;
  });
}

/**
 * Apply additional filters (conciergerie, status, zones)
 */
export function applyMissionFilters(
  missions: Mission[],
  selectedConciergeries: string[],
  selectedStatuses: string[],
  selectedMissionStatuses: string[],
  selectedZones: string[],
  homes: Home[],
  employeeName?: string,
): Mission[] {
  // If no filters are selected, show all missions
  // if (
  //   selectedConciergeries.length === 0 &&
  //   selectedStatuses.length === 0 &&
  //   selectedMissionStatuses.length === 0 &&
  //   selectedZones.length === 0
  // ) {
  //   return missions;
  // }

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

    // Filter by mission status
    if (selectedMissionStatuses.length > 0) {
      // Check if the mission matches the selected status filter
      // 'available' means no employee is assigned (employeeId is empty) AND mission is not in the past
      // 'accepted', 'started', 'completed' match the actual mission status
      const isAvailable = !mission.employeeId && new Date(mission.endDateTime) >= new Date();
      const isAccepted = mission.status === 'accepted';
      const isStarted = mission.status === 'started';
      const isCompleted = mission.status === 'completed' && (!employeeName || mission.employeeId === employeeName);

      const matchesMissionStatus =
        (selectedMissionStatuses.includes('available') && isAvailable) ||
        (selectedMissionStatuses.includes('accepted') && isAccepted) ||
        (selectedMissionStatuses.includes('started') && isStarted) ||
        (selectedMissionStatuses.includes('completed') && isCompleted);

      if (!matchesMissionStatus) return false;
    }

    // Filter by geographic zones
    if (selectedZones.length > 0) {
      const home = homes.find(h => h.id === mission.homeId);
      if (!home?.geographicZone || !selectedZones.includes(home.geographicZone)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort missions by the specified field and direction
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
