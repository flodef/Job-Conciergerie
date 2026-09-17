// Delivery channels — optional on stored rows: legacy settings predate them.
// `email` defaults to ON (existing behaviour), `push` defaults to OFF.
interface NotificationChannels {
  email?: boolean;
  push?: boolean;
}

export const wantsEmail = (settings?: NotificationChannels) => settings?.email !== false;
export const wantsPush = (settings?: NotificationChannels) => settings?.push === true;

export interface ConciergerieNotificationSettings extends NotificationChannels {
  acceptedMissions: boolean;
  startedMissions: boolean;
  completedMissions: boolean;
  missionsEndedWithoutStart: boolean;
  missionsEndedWithoutCompletion: boolean;
}
export const defaultConciergerieSettings: ConciergerieNotificationSettings = {
  email: true,
  push: false,
  acceptedMissions: true,
  startedMissions: true,
  completedMissions: true,
  missionsEndedWithoutStart: true,
  missionsEndedWithoutCompletion: true,
};

export interface EmployeeNotificationSettings extends NotificationChannels {
  acceptedMissions: boolean;
  missionChanged: boolean;
  missionDeleted: boolean;
  missionsCanceled: boolean;
}
export const defaultEmployeeSettings: EmployeeNotificationSettings = {
  email: true,
  push: false,
  acceptedMissions: true,
  missionChanged: true,
  missionDeleted: true,
  missionsCanceled: true,
};
