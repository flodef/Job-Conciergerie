'use client';

import { IconCalendarEvent, IconClock } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import { useEffect, useState } from 'react';
import { useMissions } from '../contexts/missionsProvider';
import { Mission } from '../types/types';
import {
  formatCalendarDate,
  formatMissionTimeForCalendar,
  groupMissionsByDate,
  isPastDate,
  isToday,
  sortDates,
} from '../utils/calendarUtils';
import { formatDateRange } from '../utils/dateUtils';
import { calculateEmployeePointsForDay, calculateMissionPoints, getObjectiveWithPoints } from '../utils/objectiveUtils';
import { getColorValueByName, getWelcomeParams } from '../utils/welcomeParams';
import LoadingSpinner from './loadingSpinner';
import MissionDetails from './missionDetails';

export default function CalendarView() {
  const { missions, isLoading, getConciergerieByName } = useMissions();
  const { employeeData } = getWelcomeParams();

  const [acceptedMissions, setAcceptedMissions] = useState<Mission[]>([]);
  const [missionsByDate, setMissionsByDate] = useState<Map<string, Mission[]>>(new Map());
  const [sortedDates, setSortedDates] = useState<string[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);

  const currentEmployeeId = employeeData?.id;

  useEffect(() => {
    // Filter missions that are accepted by the current employee and not deleted
    const employeeMissions = missions.filter(mission => mission.employeeId === currentEmployeeId && !mission.deleted);

    setAcceptedMissions(employeeMissions);

    // Group missions by date
    const groupedMissions = groupMissionsByDate(employeeMissions);
    setMissionsByDate(groupedMissions);

    // Sort dates
    const dates = Array.from(groupedMissions.keys());
    setSortedDates(sortDates(dates));
  }, [missions, currentEmployeeId]);

  const handleMissionClick = (mission: Mission) => {
    setSelectedMission(mission);
  };

  const handleCloseDetails = () => {
    setSelectedMission(null);
  };

  if (!currentEmployeeId) return;

  if (isLoading) {
    return (
      <div className="min-h-[calc(100dvh-9rem)] flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement du calendrier..." />
      </div>
    );
  }

  if (acceptedMissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-10rem)] border-2 border-dashed border-secondary rounded-lg p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Aucune mission acceptée</h3>
          <p className="text-light mb-4">Vous n&apos;avez pas encore accepté de missions</p>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <IconCalendarEvent size={32} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {selectedMission && <MissionDetails mission={selectedMission} onClose={handleCloseDetails} />}

      <div className="space-y-6">
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
                className={clsx(
                  'p-3 font-medium border-b border-secondary',
                  isToday(date) ? 'bg-primary/10' : isPastDate(date) ? 'bg-secondary/30' : 'bg-secondary/10',
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className={clsx(isToday(date) && 'text-primary font-bold')}>
                    {formattedDate}
                    {isToday(date) && " (Aujourd'hui)"}
                  </h3>
                  <div className="flex gap-2">
                    <span className="text-sm bg-primary/10 px-2 py-1 rounded-full text-nowrap">
                      {missionsForDate.length} mission{missionsForDate.length > 1 ? 's' : ''}
                    </span>
                    <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full text-nowrap">
                      {calculateEmployeePointsForDay(currentEmployeeId, date, missions).toFixed(1)} pts
                    </span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-secondary/30">
                {missionsForDate.map(mission => {
                  const conciergerie = getConciergerieByName(mission.conciergerieName);
                  const conciergerieColor = getColorValueByName(conciergerie?.colorName);
                  const { totalPoints } = calculateMissionPoints(mission);

                  return (
                    <div
                      key={mission.id}
                      className="p-3 hover:bg-secondary/10 cursor-pointer transition-colors"
                      onClick={() => handleMissionClick(mission)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: conciergerieColor }}
                          ></div>
                          <span className="font-medium">{mission.conciergerieName}</span>
                        </div>
                        <div className="text-sm flex items-center gap-1">
                          <IconClock size={16} />
                          <span>{formatMissionTimeForCalendar(mission, date)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2 mb-2">
                        {mission.objectives.map(objective => (
                          <span
                            key={mission.id + objective.label}
                            className="px-2 py-0.5 text-background rounded-full text-xs flex items-center gap-1"
                            style={{ backgroundColor: conciergerieColor }}
                          >
                            <span>{objective.label}</span>
                            <span className="ml-1 px-1 py-0.5 bg-background/20 rounded-full text-xs">
                              {getObjectiveWithPoints(objective.label)?.points || 0} pt
                            </span>
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-col justify-between text-sm">
                        <div className="flex items-center">
                          <span className="text-light text-nowrap">Points :&nbsp;</span>
                          <span className="font-medium">{totalPoints.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-light text-nowrap">Durée :&nbsp;</span>
                          <span className="font-medium">
                            {formatDateRange(new Date(mission.startDateTime), new Date(mission.endDateTime))}
                          </span>
                        </div>
                      </div>
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
