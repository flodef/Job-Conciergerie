export interface ConciergerieNotificationSettings {
  acceptedMissions: boolean;
  startedMissions: boolean;
  completedMissions: boolean;
  missionsEndedWithoutCompletion: boolean;
}
export const defaultConciergerieSettings: ConciergerieNotificationSettings = {
  acceptedMissions: true,
  startedMissions: true,
  completedMissions: true,
  missionsEndedWithoutCompletion: true,
};

export interface EmployeeNotificationSettings {
  acceptedMissions: boolean;
  missionChanged: boolean;
  missionDeleted: boolean;
  missionsCanceled: boolean;
}
export const defaultEmployeeSettings: EmployeeNotificationSettings = {
  acceptedMissions: true,
  missionChanged: true,
  missionDeleted: true,
  missionsCanceled: true,
};
