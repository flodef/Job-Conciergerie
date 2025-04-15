import { UserData } from '@/app/contexts/authProvider';
import { Home, Mission } from '@/app/types/dataTypes';

/**
 * Filter missions based on user type
 */
export function filterMissionsByUserType(
  missions: Mission[],
  userType: string | undefined,
  userData: UserData | undefined,
): Mission[] {
  return missions.filter(mission => {
    // For employee users, show only missions they have access to
    if (userType === 'employee') {
      if (mission.employeeId) return mission.employeeId === userData?.id;

      // If the mission has prestataires specified, check if the current employee is in the list
      if (mission.allowedEmployees?.length) return mission.allowedEmployees.includes(userData?.id ?? '');

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
): Mission[] {
  // If no filters are selected, show all missions
  if (
    selectedConciergeries.length === 0 &&
    selectedStatuses.length === 0 &&
    selectedMissionStatuses.length === 0 &&
    selectedZones.length === 0
  ) {
    return missions;
  }

  return missions.filter(mission => {
    // Filter by conciergerie
    if (selectedConciergeries.length > 0 && !selectedConciergeries.includes(mission.conciergerieName)) return false;

    // Get mission status information
    const now = new Date();
    const missionEndDate = new Date(mission.endDateTime);
    const isCurrent = missionEndDate >= now;
    const isArchived = missionEndDate < now;

    // Filter by time period status (current/archived)
    if (selectedStatuses.length > 0) {
      // If both current and archived are selected or none are selected, show all time periods
      const showAllTimePeriods =
        selectedStatuses.length === 0 ||
        (selectedStatuses.includes('current') && selectedStatuses.includes('archived'));

      if (!showAllTimePeriods) {
        const matchesTimeStatus =
          (selectedStatuses.includes('current') && isCurrent) || (selectedStatuses.includes('archived') && isArchived);

        if (!matchesTimeStatus) {
          return false;
        }
      }
    }

    // Filter by mission status
    if (selectedMissionStatuses.length > 0) {
      // Check if the mission matches the selected status filter
      // 'available' means no employee is assigned (employeeId is empty)
      // 'accepted', 'started', 'completed' match the actual mission status

      // If all statuses are selected or none are selected, show all missions
      const showAllMissionStatuses = selectedMissionStatuses.length === 0;

      if (!showAllMissionStatuses) {
        const isAvailable = !mission.employeeId;

        const matchesMissionStatus =
          (selectedMissionStatuses.includes('available') && isAvailable) ||
          (selectedMissionStatuses.includes('accepted') && mission.status === 'accepted') ||
          (selectedMissionStatuses.includes('started') && mission.status === 'started') ||
          (selectedMissionStatuses.includes('completed') && mission.status === 'completed');

        if (!matchesMissionStatus) {
          return false;
        }
      }
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
