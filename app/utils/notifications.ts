// Delivery channels — optional on stored rows: legacy settings predate them.
// `email` defaults to ON (existing behaviour), `push` defaults to OFF.
interface NotificationChannels {
  email?: boolean;
  push?: boolean;
  /** Also receive notifications while the app is closed — requires a per-device
   * web push subscription (the part Brave disables by default). Off (default) =
   * foreground notifications only, shown while the app is open via realtime. */
  pushWhenClosed?: boolean;
}

export const wantsEmail = (settings?: NotificationChannels) => settings?.email !== false;
export const wantsPush = (settings?: NotificationChannels) => settings?.push === true;

export interface ConciergerieNotificationSettings extends NotificationChannels {
  acceptedMissions: boolean;
  startedMissions: boolean;
  completedMissions: boolean;
  // Covers missions that ended late OR never started (both are != 'completed'
  // past end_date_time in the late-mission cron).
  missionsEndedWithoutCompletion: boolean;
}
export const defaultConciergerieSettings: ConciergerieNotificationSettings = {
  email: true,
  push: false,
  acceptedMissions: true,
  startedMissions: true,
  completedMissions: true,
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
