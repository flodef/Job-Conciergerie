'use server';

import type { DbConciergerie } from '@/app/db/conciergerieDb';
import {
  getAllConciergeries,
  getConciergerieByName,
  getConciergerieIds,
  getGroupForClient,
  updateConciergerie,
  updateConciergerieId,
} from '@/app/db/conciergerieDb';
import {
  getSessionCredentialIds,
  getSessionDeviceId,
  getSessionUser,
  isRowMember,
  isValidDeviceIdsUpdate,
  requireConciergerieSession,
  requireConnectedSession,
  tenantScope,
  verifyEnrollmentToken,
} from '@/app/db/session';
import { logPlanChange } from '@/app/db/billingDb';
import { PLANS } from '@/app/data/plans';
import { hashId } from '@/app/db/db';
import { DEVICE_TTL_MS, getDeviceSeenAt, seenKey, touchDeviceKeys, touchDevices } from '@/app/db/deviceSeen';
import { checkRateLimit } from '@/app/db/rateLimit';
import type { EnrollDeviceResult } from '@/app/actions/employee';
import type { Conciergerie, ConciergeriePlan } from '@/app/types/dataTypes';
import { getColorValueByName } from '@/app/utils/color';
import { baseId, getDevices, isNewDevice, MaxDevicesError } from '@/app/utils/id';
import { normalizePhone } from '@/app/utils/regex';

/**
 * Fetch all conciergeries from the database with caching
 * Cache is refreshed every hour or when explicitly revalidated.
 * Public (the registration form lists conciergeries) but device ids are only
 * exposed on the caller's own row — they are credentials.
 */
export async function fetchConciergeries(): Promise<Conciergerie[] | null> {
  const session = await getSessionUser();
  // Admin-client rows (the super-admin's own conciergerie) are hidden from the
  // registration picker — only a real (non-impersonating) admin session may
  // list them; the impersonated view mirrors what the target would see.
  const conciergeries = await getAllConciergeries((session?.isAdmin && !session?.impersonating) ?? false);

  // Convert from DB format to application format
  return (
    conciergeries
      ?.sort((a, b) => a.name.localeCompare(b.name))
      .map(c => {
        // Billing fields (discount, annual coverage) are commercially
        // sensitive — only the conciergerie's own connected member sees them.
        const ownRow = session?.userType === 'conciergerie' && session.rowKey === c.name;
        return {
          // Connected member → real ids; pending member → only its own marker; else []
          id:
            // Stored ids are hashed at rest — match either domain (transition-safe)
            session && c.id.some(i => new Set([session.userId, hashId(session.userId)]).has(baseId(i)))
              ? session.pending
                ? [`$${hashId(session.userId)}`]
                : c.id
              : [],
          name: c.name,
          email: c.email,
          tel: c.tel,
          colorName: c.colorName,
          color: getColorValueByName(c.colorName),
          notificationSettings: c.notificationSettings,
          plan: c.plan,
          // Product generation drives v3 feature locks — employees resolve
          // their tenant's version through this field, so it's on every row.
          version: c.version,
          ...(ownRow ? { discount: c.discount, billingPeriod: c.billingPeriod, planUntil: c.planUntil } : {}),
        };
      }) ?? null
  );
}

/**
 * The multi-conciergerie group the session belongs to (client_id sharing =
 * group membership). Read-only display for settings — group changes are an
 * admin operation, never self-service.
 */
export async function fetchMyGroup(): Promise<{ name: string | null; members: string[] } | null> {
  const session = await requireConnectedSession();
  if (!session) return null;
  const scope = tenantScope(session);
  // Unscoped (non-impersonating admin) or client-less session: no group
  if (!scope) return { name: null, members: [] };
  return await getGroupForClient(scope);
}

/**
 * Enroll the session device in a conciergerie's id array.
 * The new array is computed server-side from the current row:
 * - connected member → re-enrolls freely (no proof needed);
 * - valid email token → connects the device immediately;
 * - anything else → the device is added as a pending (`$`) access request that a
 *   connected member can approve from Settings — pending devices have no session
 *   privileges until approved.
 */
export async function enrollConciergerieDevice(
  name: string,
  evictOldest: boolean,
  token?: string,
): Promise<EnrollDeviceResult> {
  const session = await getSessionUser();
  const deviceId = session?.userId ?? (await getSessionDeviceId());
  if (!deviceId || !name) return { ok: false, reason: 'invalid' };

  // Same bounds as employee enrollment: per IP and per device
  if (!(await checkRateLimit('enroll', 10, 600))) return { ok: false, reason: 'rate_limited' };
  if (!(await checkRateLimit('enroll', 5, 3600, deviceId))) return { ok: false, reason: 'rate_limited' };

  const ids = await getConciergerieIds(name);
  if (!ids) return { ok: false, reason: 'not_found' };

  // Stored ids are hashed — normalize this device's own raw entries first
  const hid = hashId(deviceId);
  let normalized = ids.map(i => (baseId(i) === deviceId ? (isNewDevice(i) ? `$${hid}` : hid) : i));
  // An expired entry must not count as membership — drop it so the device goes
  // back through the token/pending flow (which resets its clock below).
  const ownSeenAt = await getDeviceSeenAt(hid);
  if (ownSeenAt !== undefined && Date.now() - ownSeenAt > DEVICE_TTL_MS)
    normalized = normalized.filter(i => baseId(i) !== hid);
  const alreadyMember = normalized.some(i => !isNewDevice(i) && baseId(i) === hid);
  const hasToken = verifyEnrollmentToken('conciergerie', name, deviceId, token);
  const markPending = !alreadyMember && !hasToken;

  try {
    const newIds = getDevices(normalized, hid, markPending, evictOldest);
    const updated = await updateConciergerieId(name, newIds);
    if (!updated) return { ok: false, reason: 'invalid' };
    // Enrollment is fresh proof (email token or member approval) — reset the clock
    await touchDevices([deviceId]);
    // A pending device gets back only its own marker — never the row's real credentials
    return { ok: true, ids: markPending ? [`$${hid}`] : updated, deviceId, alreadyMember, pending: markPending };
  } catch (error) {
    if (error instanceof MaxDevicesError) return { ok: false, reason: 'max_devices', oldestDevice: error.oldestDevice };
    throw error;
  }
}

/**
 * Update a conciergerie with a user ID.
 * Restricted to connected devices of the row managing their own device list —
 * new-device enrollment goes through `enrollConciergerieDevice`.
 */
export async function updateConciergerieWithUserId(
  conciergerie: Conciergerie | undefined,
  conciergerieIds: string[],
): Promise<string[] | null> {
  if (!conciergerie) return null;

  const sessionIds = await getSessionCredentialIds();
  if (!sessionIds.size) return null;

  const currentIds = await getConciergerieIds(conciergerie.name);
  if (!currentIds || !isValidDeviceIdsUpdate(currentIds, conciergerieIds, sessionIds)) return null;

  // Update the conciergerie's ID in the database
  const updated = await updateConciergerieId(conciergerie.name, conciergerieIds);
  // Entries whose stored form changed (e.g. `$h` approved → `h`) get a fresh clock
  if (updated) {
    const changed = conciergerieIds.filter(i => !currentIds.includes(i));
    if (changed.length) await touchDeviceKeys(changed.map(seenKey));
  }
  return updated;
}

export async function updateConciergerieData(
  conciergerie: Conciergerie | undefined,
  data: Partial<Conciergerie>,
): Promise<Conciergerie | null> {
  const session = await requireConnectedSession();
  if (!session || !conciergerie) return null;

  // Only a connected member of the row may edit it — otherwise any user could
  // rewrite a conciergerie's contact details.
  const ids = await getConciergerieIds(conciergerie.name);
  if (!ids || !isRowMember(session, ids)) return null;

  // Convert to DB format. `plan` is deliberately excluded — subscription
  // changes go through `changeMyPlan` (logged for monthly billing), never
  // through a generic data write.
  const dbData: Partial<DbConciergerie> = {
    name: data.name,
    email: data.email,
    tel: data.tel === undefined ? undefined : normalizePhone(data.tel),
    color_name: data.colorName,
    notification_settings: data.notificationSettings ? JSON.stringify(data.notificationSettings) : null,
  };

  return await updateConciergerie(conciergerie.name, dbData, tenantScope(session));
}

/**
 * Self-service plan change — effective immediately and logged in
 * plan_changes so the monthly billing cron can bill the highest plan used.
 * Only a conciergerie session may change its own plan (admin impersonation
 * acts on behalf of the target and is marked 'admin' in the log).
 */
export async function changeMyPlan(newPlan: ConciergeriePlan): Promise<Conciergerie | null> {
  const session = await requireConciergerieSession();
  if (!session || !(newPlan in PLANS)) return null;
  // A super-admin's own "plan" is meaningless — they act via impersonation
  // (logged 'admin'), never on the admin row itself.
  if (session.isAdmin && !session.impersonating) return null;

  const current = await getConciergerieByName(session.rowKey);
  if (!current || current.plan === newPlan) return null;

  // An annual subscription runs its full year — paid upfront, it cannot be
  // switched or downgraded mid-period. A new plan is chosen at expiry.
  if (current.billingPeriod === 'annual' && current.planUntil && new Date(current.planUntil) > new Date()) {
    return null;
  }

  const updated = await updateConciergerie(session.rowKey, { plan: newPlan }, tenantScope(session));
  if (updated) {
    await logPlanChange(
      session.rowKey,
      current.plan ?? null,
      newPlan,
      session.impersonating ? 'admin' : session.rowKey,
      session.clientId ?? undefined,
    );
  }
  return updated;
}
