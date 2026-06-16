'use client';

import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useModal } from '@/app/contexts/modalProvider';
import { useToast } from '@/app/contexts/toastProvider';
import { useFetchTime } from '@/app/hooks/useFetchTime';
import MissionDetails from '@/app/missions/components/missionDetails';
import type { Mission } from '@/app/types/dataTypes';
import { formatCalendarDate, formatMissionTimeForCalendar, groupMissionsByDate } from '@/app/utils/calendar';
import {
  cn,
  containerClassName,
  descriptionClassName,
  textPulseClassName,
  titleClassName,
} from '@/app/utils/className';
import { getColorValueByName } from '@/app/utils/color';
import { isToday, sortDates } from '@/app/utils/date';
import { Page } from '@/app/utils/navigation';
import { calculateEmployeeHoursForDay, formatHours } from '@/app/utils/task';
import { IconAlertTriangle, IconCalendarEvent, IconClock, IconPlayerPlay, IconUsers } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import M3LoadingSpinner from '../components/m3LoadingSpinner';
import { isMissionExpired, isPartOfMission } from '../utils/missionFilters';
import { getUserKey } from '../utils/user';

export default function Calendar() {
  const {
    conciergerieName,
    isEmployee,
    isConciergerie,
    isLoading: authLoading,
    employeeName,
    findEmployee,
    findConciergerie,
    userData,
  } = useAuth();
  const { missions, isLoading: missionsLoading, fetchMissions, getLateMissions } = useMissions();
  const { homes } = useHomes();
  const { needsRefresh, updateFetchTime } = useFetchTime();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const needsRefreshCalendar = needsRefresh[Page.Calendar];
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Track when initial load completes
  useEffect(() => {
    if (!authLoading && !missionsLoading) setHasLoadedOnce(true);
  }, [authLoading, missionsLoading]);

  const [acceptedMissions, setAcceptedMissions] = useState<Mission[]>([]);
  const [missionsByDate, setMissionsByDate] = useState<Map<string, Mission[]>>(new Map());
  const [sortedDates, setSortedDates] = useState<string[]>([]);

  const [startedMissionsCount, setStartedMissionsCount] = useState(0);
  const [lateMissionsCount, setLateMissionsCount] = useState(0);
  const [missingPartnerMissionsCount, setMissingPartnerMissionsCount] = useState(0);

  const [startedMissions, setStartedMissions] = useState<Mission[]>([]);
  const [lateMissionsList, setLateMissionsList] = useState<Mission[]>([]);
  const [missingPartnerMissionsList, setMissingPartnerMissionsList] = useState<Mission[]>([]);

  const [startedMissionIndex, setStartedMissionIndex] = useState(0);
  const [lateMissionIndex, setLateMissionIndex] = useState(0);
  const [missingPartnerMissionIndex, setMissingPartnerMissionIndex] = useState(0);

  const lateMissions = useMemo(() => getLateMissions(acceptedMissions), [acceptedMissions, getLateMissions]);

  // Reload missions when needed
  const isFetching = useRef(false);
  useEffect(() => {
    // Skip if still loading or already fetching or no refresh needed
    if (authLoading || isFetching.current || !needsRefreshCalendar) return;

    isFetching.current = true;
    fetchMissions()
      .then(isSuccess => {
        if (isSuccess) updateFetchTime([Page.Calendar, Page.Missions, Page.Homes]);
        else if (!hasLoadedOnce)
          showToast({
            type: ToastType.Error,
            message: 'Erreur lors du chargement des missions',
          });
      })
      .finally(() => (isFetching.current = false));
  }, [authLoading, fetchMissions, updateFetchTime, needsRefreshCalendar, showToast, hasLoadedOnce]);

  // Second useEffect to handle mission filtering after we have the user identity
  useEffect(() => {
    if (!isEmployee && !isConciergerie) return;

    const filteredMissions = missions.filter(
      mission =>
        (mission.status && mission.status !== 'completed') ||
        (isConciergerie && !mission.status && isMissionExpired(mission)),
    );

    // Filter by user type
    const userFilteredMissions = filteredMissions.filter(mission =>
      isEmployee ? isPartOfMission(mission, employeeName) : mission.conciergerieName === conciergerieName,
    );

    // Count started missions
    const started = userFilteredMissions.filter(mission => mission.status === 'started');
    setStartedMissionsCount(started.length);
    setStartedMissions(started);

    // Count late missions (ended without being started)
    const late = getLateMissions(userFilteredMissions).sort(
      (a, b) => a.endDateTime.getTime() - b.endDateTime.getTime(),
    );
    setLateMissionsCount(late.length);
    setLateMissionsList(late);

    // Count missions missing a partner (duo missions with only one employee assigned)
    if (isConciergerie) {
      const missingPartner = userFilteredMissions.filter(
        mission =>
          mission.allowDuo &&
          ((mission.employeeId && !mission.employeeId2) || (!mission.employeeId && mission.employeeId2)),
      );
      setMissingPartnerMissionsCount(missingPartner.length);
      setMissingPartnerMissionsList(missingPartner);
    }

    setAcceptedMissions(userFilteredMissions);

    // Group missions by date
    const groupedMissions = groupMissionsByDate(userFilteredMissions);
    setMissionsByDate(groupedMissions);

    // Sort dates
    const dates = sortDates(Array.from(groupedMissions.keys()));
    setSortedDates(dates);
  }, [missions, conciergerieName, employeeName, isEmployee, isConciergerie, getLateMissions, homes]);

  const handleMissionClick = (mission: Mission) => {
    const id = openModal(() => <MissionDetails mission={mission} onClose={() => closeModal(id)} isFromCalendar />);
  };

  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleBadgeClick = (type: 'started' | 'late' | 'missingPartner') => {
    let missions: Mission[] = [];
    let index = 0;

    if (type === 'started' && startedMissions.length > 0) {
      missions = startedMissions;
      index = startedMissionIndex;
      setStartedMissionIndex(prev => (prev + 1) % startedMissions.length);
    } else if (type === 'late' && lateMissionsList.length > 0) {
      missions = lateMissionsList;
      index = lateMissionIndex;
      setLateMissionIndex(prev => (prev + 1) % lateMissionsList.length);
    } else if (type === 'missingPartner' && missingPartnerMissionsList.length > 0) {
      missions = missingPartnerMissionsList;
      index = missingPartnerMissionIndex;
      setMissingPartnerMissionIndex(prev => (prev + 1) % missingPartnerMissionsList.length);
    }

    if (missions.length > 0) {
      const mission = missions[index];
      const element = document.getElementById(`mission-${mission.id}`);
      if (element) {
        // Clear any existing highlight timeout
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
          // Remove highlight from any previously highlighted element
          document.querySelectorAll('.highlighted-mission').forEach(el => {
            el.classList.remove('highlighted-mission', 'border-2', 'border-primary');
          });
        }

        // Scroll to the day container instead of the mission card to keep the day title visible
        const dayContainer = element.closest('[data-day-container]');
        if (dayContainer) {
          dayContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Add highlight using border for visibility on all sides
        element.classList.add('highlighted-mission', 'border-2', 'border-primary');

        // Set timeout to remove highlight
        highlightTimeoutRef.current = setTimeout(() => {
          element.classList.remove('highlighted-mission', 'border-2', 'border-primary');
          highlightTimeoutRef.current = null;
        }, 2000);
      }
    }
  };

  // Only show empty state if not loading and we've confirmed there are no missions
  if (!hasLoadedOnce) return <M3LoadingSpinner />;

  if (acceptedMissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-10.5rem)] border-2 border-dashed border-secondary rounded-lg p-4 m-4">
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <h3 className={titleClassName}>{isEmployee ? 'Aucune mission acceptée' : 'Aucune mission en cours'}</h3>
          <p className="text-light">
            {isEmployee
              ? "Vous n'avez pas encore accepté de missions"
              : "Aucun prestataire n'a accepté de missions de votre conciergerie"}
          </p>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <IconCalendarEvent size={32} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-full px-4">
      {/* Badge for started missions */}
      {startedMissionsCount + lateMissionsCount + missingPartnerMissionsCount > 0 && (
        <div className="sticky top-0 z-20 bg-background space-y-2 mb-4">
          {startedMissionsCount > 0 && (
            <div
              className="p-2 border border-blue-200 rounded-lg flex items-center justify-between cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/10 transition-colors"
              onClick={() => handleBadgeClick('started')}
            >
              <div className="flex items-center">
                <IconPlayerPlay className="text-blue-500 mr-2" />
                <span>
                  <span className="font-medium">{startedMissionsCount}</span> mission
                  {startedMissionsCount > 1 ? 's' : ''} en cours
                </span>
              </div>
            </div>
          )}

          {lateMissionsCount > 0 && (
            <div
              className="p-2 border border-red-200 bg-red-50 dark:bg-red-950/10 rounded-lg flex items-center justify-between cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/20 transition-colors"
              onClick={() => handleBadgeClick('late')}
            >
              <div className="flex items-center">
                <IconAlertTriangle className="text-red-500 mr-2" />
                <span>
                  <span className="font-medium">{lateMissionsCount}</span> mission{lateMissionsCount > 1 ? 's' : ''} en
                  retard non terminée{lateMissionsCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {missingPartnerMissionsCount > 0 && (
            <div
              className="p-2 border border-orange-200 bg-orange-50 dark:bg-orange-950/10 rounded-lg flex items-center justify-between cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/20 transition-colors"
              onClick={() => handleBadgeClick('missingPartner')}
            >
              <div className="flex items-center">
                <IconAlertTriangle className="text-orange-500 mr-2" />
                <span>
                  <span className="font-medium">{missingPartnerMissionsCount}</span> mission
                  {missingPartnerMissionsCount > 1 ? 's' : ''} duo sans partenaire
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {sortedDates.map(dateStr => {
          // Create a date object from the date string (which is in YYYY-MM-DD format)
          // Parse the parts manually to ensure we're using local time
          const [year, month, day] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          const formattedDate = formatCalendarDate(date);
          const missionsForDate = missionsByDate.get(dateStr) || [];

          return (
            <div key={dateStr} data-day-container className="border border-secondary rounded-lg overflow-hidden">
              <div
                className={cn(
                  'p-3 font-medium border-b border-secondary',
                  isToday(date) ? 'bg-primary/10' : 'bg-foreground/10',
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className={cn(isToday(date) && 'text-primary font-bold')}>
                    {formattedDate}
                    {isToday(date) && " (Aujourd'hui)"}
                  </h3>
                  <div className="flex gap-2">
                    <span className="text-sm bg-primary/10 px-2 py-1 rounded-full text-nowrap">
                      {missionsForDate.length} mission{missionsForDate.length > 1 ? 's' : ''}
                    </span>
                    {isEmployee &&
                      employeeName &&
                      (() => {
                        const hours = calculateEmployeeHoursForDay(employeeName, date, missionsForDate);
                        const hoursClass =
                          hours > 10
                            ? 'bg-red-200 text-red-700'
                            : hours > 5
                              ? 'bg-orange-200 text-orange-700'
                              : 'bg-green-200 text-green-700';
                        return (
                          <span className={`text-sm ${hoursClass} px-2 py-1 rounded-full text-nowrap`}>
                            {formatHours(hours)}
                          </span>
                        );
                      })()}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-secondary/30">
                {missionsForDate.map(mission => {
                  const conciergerie = findConciergerie(mission.conciergerieName);
                  const conciergerieColor = getColorValueByName(conciergerie?.colorName);
                  const home = homes.find(h => h.id === mission.homeId);
                  const employee = findEmployee(mission.employeeId);
                  const employee2 = findEmployee(mission.employeeId2) || findConciergerie(mission.employeeId2);

                  return (
                    <div
                      id={`mission-${mission.id}`}
                      key={mission.id}
                      className={cn(
                        'p-3 hover:bg-secondary/10 cursor-pointer transition-colors relative',
                        mission.status === 'started' ? 'animate-pulse' : '',
                      )}
                      onClick={() => handleMissionClick(mission)}
                    >
                      {lateMissions.includes(mission) && (
                        <div
                          className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center z-10"
                          aria-hidden="true"
                        >
                          <div
                            className="absolute text-sm font-bold text-white bg-red-500/80 px-1 py-0.5 uppercase tracking-wider whitespace-nowrap"
                            style={{
                              transform: 'rotate(10deg) scale(0.9)',
                              transformOrigin: 'center',
                              textAlign: 'center',
                              width: '120%',
                            }}
                          >
                            ⚠️ MISSION EN RETARD NON TERMINÉE ⚠️
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <span>{`${home?.title} (${home?.geographicZone})`}</span>
                        <div className={containerClassName}>
                          <IconClock className="min-w-4" size={16} />
                          <span className="whitespace-nowrap">{formatMissionTimeForCalendar(mission, date)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm mt-2 mb-2">
                        <div className="flex flex-wrap gap-1">
                          {mission.tasks.map(task => (
                            <span
                              key={mission.id + task}
                              className="px-2 py-0.5 text-background rounded-full text-xs"
                              style={{ backgroundColor: conciergerieColor }}
                            >
                              {task}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center">
                          <span className="text-light text-nowrap">Heures :&nbsp;</span>
                          <span className="font-medium">{formatHours(mission.hours)}</span>
                        </div>
                      </div>

                      {isEmployee && (
                        <div className="flex items-center text-sm">
                          <span className={descriptionClassName}>Conciergerie :&nbsp;</span>
                          <span>{mission.conciergerieName}</span>
                        </div>
                      )}

                      {mission.allowDuo ? (
                        <div className="flex items-center text-sm mt-1">
                          <IconUsers className="mr-1" size={16} />
                          <span className={cn(descriptionClassName, 'text-nowrap')}>Binôme :&nbsp;</span>
                          {isConciergerie ? (
                            <>
                              {employee && employee2 ? (
                                <span>
                                  {getUserKey(employee)} + {getUserKey(employee2)}
                                </span>
                              ) : employee ? (
                                <span className="animate-pulse">⚠️ {getUserKey(employee)} ⚠️</span>
                              ) : employee2 ? (
                                <span className="animate-pulse">⚠️ {getUserKey(employee2)} ⚠️</span>
                              ) : (
                                <span>-</span>
                              )}
                            </>
                          ) : (
                            <>
                              {employee && userData && getUserKey(userData) === getUserKey(employee) ? (
                                employee2 ? (
                                  <span>{getUserKey(employee2)}</span>
                                ) : (
                                  <span className={textPulseClassName}>En attente...</span>
                                )
                              ) : employee2 && userData && getUserKey(userData) === getUserKey(employee2) ? (
                                employee ? (
                                  <span>{getUserKey(employee)}</span>
                                ) : (
                                  <span className={textPulseClassName}>En attente...</span>
                                )
                              ) : (
                                <span>-</span>
                              )}
                            </>
                          )}
                        </div>
                      ) : isConciergerie ? (
                        <div className="flex items-center text-sm">
                          <span className="text-light text-nowrap">Prestataire :&nbsp;</span>
                          <span>{employee ? getUserKey(employee) : '-'}</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
