// Foreground notifications — driven by Supabase realtime events while the app
// is open, with no push service involved (works on Brave et al.). The event →
// alert mapping mirrors the server-side email/push senders in actions/email.ts.

import type { MissionStatus } from '@/app/types/dataTypes';
import type { ConciergerieNotificationSettings, EmployeeNotificationSettings } from '@/app/utils/notifications';
import { wantsPush } from '@/app/utils/notifications';
import { getDeviceSubscription, showForegroundNotification } from '@/app/utils/pushClient';
import type { UserType } from '@/app/contexts/authProvider';

export interface ForegroundAlert {
  key: keyof ConciergerieNotificationSettings | keyof EmployeeNotificationSettings;
  title: string;
  body?: string;
}

// Raw snake_case row as delivered by postgres_changes (REPLICA IDENTITY FULL
// gives the complete old row on UPDATE/DELETE too).
export interface MissionRow {
  employee_id?: string | null;
  employee_id_2?: string | null;
  conciergerie_name?: string;
  home_id?: string;
  status?: MissionStatus | null;
  late_notified_at?: string | null;
  allowed_employees?: string[] | null;
  [key: string]: unknown;
}

const isAssigned = (row: MissionRow | undefined, myKey: string) =>
  !!row && (row.employee_id === myKey || row.employee_id_2 === myKey);

// Fields a conciergerie can edit — status/late_notified_at/modified_date are
// excluded so the employee's own actions (accept/start/complete) and the late
// cron's bookkeeping write don't fire a spurious "Mission modifiée".
const EDITABLE_FIELDS = [
  'home_id',
  'tasks',
  'start_date_time',
  'end_date_time',
  'employee_id',
  'employee_id_2',
  'conciergerie_name',
  'allowed_employees',
  'hours',
  'allow_duo',
  'travellers',
  'conciergerie_comment',
] as const;

const wasEdited = (oldRow: MissionRow, newRow: MissionRow) =>
  EDITABLE_FIELDS.some(f => JSON.stringify(oldRow[f] ?? null) !== JSON.stringify(newRow[f] ?? null));

export const detectMissionAlert = (
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  oldRow: MissionRow | undefined,
  newRow: MissionRow | undefined,
  ctx: { userType: UserType; myKey: string; homeTitle?: string },
): ForegroundAlert | null => {
  const { userType, myKey, homeTitle } = ctx;
  const body = homeTitle || undefined;

  if (userType === 'conciergerie') {
    const row = newRow ?? oldRow;
    if (row?.conciergerie_name !== myKey) return null;
    if (eventType !== 'UPDATE' || !oldRow || !newRow) return null;

    // Provider lifecycle transitions — the same keys the status sender uses.
    if (oldRow.status !== newRow.status && newRow.status) {
      const mapped = (
        {
          accepted: { key: 'acceptedMissions', title: 'Mission acceptée' },
          started: { key: 'startedMissions', title: 'Mission démarrée' },
          completed: { key: 'completedMissions', title: 'Mission terminée' },
        } as const
      )[newRow.status];
      return mapped ? { ...mapped, body } : null;
    }
    // The late-mission cron stamps late_notified_at — surfaces as an UPDATE.
    if (!oldRow.late_notified_at && newRow.late_notified_at)
      return { key: 'missionsEndedWithoutCompletion', title: 'Mission non terminée à temps', body };
    return null;
  }

  // employee — "mine" = assigned in either binôme slot
  const wasMine = isAssigned(oldRow, myKey);
  const isMine = isAssigned(newRow, myKey);
  if (eventType === 'INSERT') return isMine ? { key: 'acceptedMissions', title: 'Mission confirmée', body } : null;
  if (eventType === 'DELETE') return wasMine ? { key: 'missionDeleted', title: 'Mission supprimée', body } : null;
  if (!oldRow || !newRow) return null;
  if (!wasMine && isMine) return { key: 'acceptedMissions', title: 'Mission confirmée', body };
  if (wasMine && !isMine) return { key: 'missionsCanceled', title: 'Mission annulée', body };
  // Same assignment + a real edit (status changes are the employee's own doing)
  if (isMine && oldRow.status === newRow.status && wasEdited(oldRow, newRow))
    return { key: 'missionChanged', title: 'Mission modifiée', body };
  return null;
};

/**
 * Show `alert` if the user's settings allow it AND this device has no push
 * subscription — when it does, the server push already delivers (including
 * while the app is open), so firing here would double-notify.
 * `pushAllowed` mirrors the plan+version gates (Pro+ plan AND v3 tenant): a
 * Découverte or v2 account with a legacy `push: true` in its stored settings
 * must not get foreground notifications either.
 */
export const fireForegroundNotification = async (
  alert: ForegroundAlert,
  settings: ConciergerieNotificationSettings | EmployeeNotificationSettings | undefined,
  pushAllowed: boolean,
) => {
  if (!pushAllowed) return;
  if (!wantsPush(settings) || (settings as Record<string, unknown> | undefined)?.[alert.key] !== true) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (await getDeviceSubscription()) return;
  await showForegroundNotification(alert.title, alert.body);
};
