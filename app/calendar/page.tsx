'use client';

import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { getUserKey, useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useFetchTime } from '@/app/hooks/useFetchTime';
import MissionDetails from '@/app/missions/components/missionDetails';
import { Mission } from '@/app/types/dataTypes';
import { formatCalendarDate, formatMissionTimeForCalendar, groupMissionsByDate } from '@/app/utils/calendar';
import {
  cn,
  containerClassName,
  descriptionClassName,
  textPulseClassName,
  titleClassName,
} from '@/app/utils/className';
import { getColorValueByName } from '@/app/utils/color';
import { isPastDate, isToday, sortDates } from '@/app/utils/date';
import { Page } from '@/app/utils/navigation';
import { calculateEmployeeHoursForDay, formatHour } from '@/app/utils/task';
import { IconAlertTriangle, IconCalendarEvent, IconClock, IconPlayerPlay, IconUsers } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import M3LoadingSpinner from '../components/m3LoadingSpinner';

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
  const needsRefreshCalendar = needsRefresh[Page.Calendar];
  const [toast, setToast] = useState<Toast>();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Track when initial load completes
  useEffect(() => {
    if (!authLoading && !missionsLoading) setHasLoadedOnce(true);
  }, [authLoading, missionsLoading]);

  const [acceptedMissions, setAcceptedMissions] = useState<Mission[]>([]);
  const [missionsByDate, setMissionsByDate] = useState<Map<string, Mission[]>>(new Map());
  const [sortedDates, setSortedDates] = useState<string[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  const [startedMissionsCount, setStartedMissionsCount] = useState(0);
  const [lateMissionsCount, setLateMissionsCount] = useState(0);
  const [missingPartnerMissionsCount, setMissingPartnerMissionsCount] = useState(0);

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
        else
          setToast({
            type: ToastType.Error,
            message: 'Erreur lors du chargement des missions',
          });
      })
      .finally(() => (isFetching.current = false));
  }, [authLoading, fetchMissions, updateFetchTime, needsRefreshCalendar]);

  // Second useEffect to handle mission filtering after we have the user identity
  useEffect(() => {
    if (!isEmployee && !isConciergerie) return;

    const filteredMissions = missions.filter(
      mission =>
        mission.status &&
        mission.status !== 'completed' &&
        (isEmployee
          ? mission.employeeId === employeeName || mission.employeeId2 === employeeName
          : mission.conciergerieName === conciergerieName),
    );

    // Count started missions
    const startedCount = filteredMissions.filter(mission => mission.status === 'started').length;
    setStartedMissionsCount(startedCount);

    // Count late missions (ended without being started)
    const lateCount = getLateMissions(filteredMissions).length;
    setLateMissionsCount(lateCount);

    // Count missions missing a partner (duo missions with only one employee assigned)
    if (isConciergerie) {
      const missingPartner = filteredMissions.filter(mission => {
        const home = homes.find(h => h.id === mission.homeId);
        return (
          (home?.allowDuo && mission.employeeId && !mission.employeeId2) || (!mission.employeeId && mission.employeeId2)
        );
      });
      setMissingPartnerMissionsCount(missingPartner.length);
    }

    setAcceptedMissions(filteredMissions);

    // Group missions by date
    const groupedMissions = groupMissionsByDate(filteredMissions);
    setMissionsByDate(groupedMissions);

    // Sort dates
    const dates = sortDates(Array.from(groupedMissions.keys()));
    setSortedDates(dates);
  }, [missions, conciergerieName, employeeName, isEmployee, isConciergerie, getLateMissions]);

  const handleMissionClick = (mission: Mission) => {
    setSelectedMission(mission);
  };

  const handleCloseDetails = () => {
    setSelectedMission(null);
  };

  // Only show empty state if not loading and we've confirmed there are no missions
  if (!hasLoadedOnce) return <M3LoadingSpinner />;

  if (acceptedMissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-10rem)] border-2 border-dashed border-secondary rounded-lg p-8">
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <h3 className={titleClassName}>{isEmployee ? 'Aucune mission acceptée' : 'Aucune mission en cours'}</h3>
          <p className="text-light">
            {isEmployee
              ? "Vous n'avez pas encore accepté de missions"
              : "Aucun employé n'a accepté de missions de votre conciergerie"}
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
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />

      {/* Badge for started missions */}
      {startedMissionsCount + lateMissionsCount + missingPartnerMissionsCount > 0 && (
        <div className="sticky top-0 z-20 bg-background space-y-2 mb-4">
          {startedMissionsCount > 0 && (
            <div className="p-2 border border-blue-200 rounded-lg flex items-center justify-between">
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
            <div className="p-2 border border-red-200 bg-red-50 dark:bg-red-950/10 rounded-lg flex items-center justify-between">
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
            <div className="p-2 border border-orange-200 bg-orange-50 dark:bg-orange-950/10 rounded-lg flex items-center justify-between">
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

      {selectedMission && (
        <MissionDetails mission={selectedMission} onClose={handleCloseDetails} isFromCalendar={true} />
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
            <div key={dateStr} className="border border-secondary rounded-lg overflow-hidden">
              <div
                className={cn(
                  'p-3 font-medium border-b border-secondary',
                  isToday(date) ? 'bg-primary/10' : isPastDate(date) ? 'bg-secondary/30' : 'bg-secondary/10',
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
                            {formatHour(hours)}
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
                  const employee2 = findEmployee(mission.employeeId2);

                  return (
                    <div
                      key={mission.id}
                      className={cn(
                        'p-3 hover:bg-secondary/10 cursor-pointer transition-colors relative',
                        mission.status === 'started' ? 'animate-pulse' : '',
                      )}
                      onClick={() => handleMissionClick(mission)}
                    >
                      {lateMissions.includes(mission) && (
                        <div
                          className="absolute text-sm font-bold text-white bg-red-500/80 px-1 py-0.5 uppercase tracking-wider whitespace-nowrap z-10"
                          style={{
                            transform: 'rotate(15deg) scale(0.9)',
                            transformOrigin: 'center',
                            width: '140%',
                            textAlign: 'center',
                            top: '50%',
                            left: '50%',
                            marginLeft: '-70%',
                            marginTop: '-10px',
                          }}
                        >
                          ⚠️ MISSION EN RETARD NON TERMINÉE ⚠️
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
                          <span className="font-medium">{formatHour(mission.hours)}</span>
                        </div>
                      </div>

                      {isEmployee && (
                        <div className="flex items-center text-sm">
                          <span className={descriptionClassName}>Conciergerie :&nbsp;</span>
                          <span>{mission.conciergerieName}</span>
                        </div>
                      )}

                      {home?.allowDuo ? (
                        <div className="flex items-center text-sm mt-1">
                          <IconUsers className="mr-1" size={16} />
                          <span className={cn(descriptionClassName, 'text-nowrap')}>Binôme :&nbsp;</span>
                          {isConciergerie ? (
                            <>
                              {employee && employee2 ? (
                                <span>
                                  {employee.firstName} {employee.familyName} + {employee2.firstName}{' '}
                                  {employee2.familyName}
                                </span>
                              ) : employee ? (
                                <span className="animate-pulse">
                                  ⚠️ {employee.firstName} {employee.familyName} ⚠️
                                </span>
                              ) : employee2 ? (
                                <span className="animate-pulse">
                                  ⚠️ {employee2.firstName} {employee2.familyName} ⚠️
                                </span>
                              ) : (
                                <span>-</span>
                              )}
                            </>
                          ) : (
                            <>
                              {employee && userData && getUserKey(userData) === getUserKey(employee) ? (
                                employee2 ? (
                                  <span>
                                    {employee2.firstName} {employee2.familyName}
                                  </span>
                                ) : (
                                  <span className={textPulseClassName}>En attente...</span>
                                )
                              ) : employee2 && userData && getUserKey(userData) === getUserKey(employee2) ? (
                                employee ? (
                                  <span>
                                    {employee.firstName} {employee.familyName}
                                  </span>
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
                          <span>
                            {employee?.firstName} {employee?.familyName}
                          </span>
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
