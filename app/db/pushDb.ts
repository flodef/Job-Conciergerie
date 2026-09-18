import { sql } from '@/app/db/db';
import type { UserType } from '@/app/contexts/authProvider';
import { PLAN_LIMITS } from '@/app/data/plans';
import { getUserPlan } from '@/app/db/planDb';

/**
 * Web push subscriptions: one row per (device, user) pair. Callers must derive
 * the identity from the session (userType, rowKey, clientId) — never from
 * client input. The table is created lazily — see
 * migrations/create_push_subscriptions.sql.
 */

export interface PushSubscriptionRow {
  endpoint: string;
  user_type: UserType;
  row_key: string;
  p256dh: string;
  auth: string;
  client_id: string | null;
  user_agent: string | null;
  created_at: string;
}

// The cached promise must reset on failure — otherwise one transient error
// poisons the table setup until the instance restarts.
let tableReady: Promise<unknown> | null = null;
export const ensurePushSubscriptionsTable = () => {
  tableReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint text PRIMARY KEY,
        user_type text NOT NULL CHECK (user_type IN ('conciergerie', 'employee')),
        row_key text NOT NULL,
        p256dh text NOT NULL,
        auth text NOT NULL,
        client_id uuid,
        user_agent text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_type, row_key)`;
  })().catch(e => {
    tableReady = null;
    throw e;
  });
  return tableReady;
};

export const savePushSubscription = async (
  userType: UserType,
  rowKey: string,
  clientId: string | null | undefined,
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent: string | null,
): Promise<boolean> => {
  try {
    await ensurePushSubscriptionsTable();
    await sql`
      INSERT INTO push_subscriptions (endpoint, user_type, row_key, p256dh, auth, client_id, user_agent)
      VALUES (${endpoint}, ${userType}, ${rowKey}, ${p256dh}, ${auth}, ${clientId ?? null}, ${userAgent})
      ON CONFLICT (endpoint) DO UPDATE SET
        user_type = EXCLUDED.user_type,
        row_key = EXCLUDED.row_key,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        client_id = EXCLUDED.client_id,
        user_agent = EXCLUDED.user_agent`;
    return true;
  } catch (e) {
    console.error('[push] savePushSubscription failed:', e);
    return false;
  }
};

export const deletePushSubscription = async (
  endpoint: string,
  userType: UserType,
  rowKey: string,
): Promise<boolean> => {
  try {
    await ensurePushSubscriptionsTable();
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND user_type = ${userType} AND row_key = ${rowKey}`;
    return true;
  } catch (e) {
    console.error('[push] deletePushSubscription failed:', e);
    return false;
  }
};

export const deletePushSubscriptionsFor = async (userType: UserType, rowKey: string): Promise<boolean> => {
  try {
    await ensurePushSubscriptionsTable();
    await sql`DELETE FROM push_subscriptions WHERE user_type = ${userType} AND row_key = ${rowKey}`;
    return true;
  } catch (e) {
    console.error('[push] deletePushSubscriptionsFor failed:', e);
    return false;
  }
};

export const getPushSubscriptionsFor = async (
  userType: UserType,
  rowKey: string,
): Promise<Pick<PushSubscriptionRow, 'endpoint' | 'p256dh' | 'auth'>[]> => {
  try {
    await ensurePushSubscriptionsTable();
    const rows = await sql`
      SELECT endpoint, p256dh, auth FROM push_subscriptions
      WHERE user_type = ${userType} AND row_key = ${rowKey}`;
    return rows as unknown as Pick<PushSubscriptionRow, 'endpoint' | 'p256dh' | 'auth'>[];
  } catch (e) {
    console.error('[push] getPushSubscriptionsFor failed:', e);
    return [];
  }
};

// ------------------------------------------------------------------
// Sending — web-push fan-out to every device subscribed by the user.
// Best-effort: stale endpoints (410/404) are deleted, other failures logged.
// ------------------------------------------------------------------

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
}

let vapidReady: boolean | null = null;
const initVapid = async (): Promise<boolean> => {
  if (vapidReady !== null) return vapidReady;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys not configured — push disabled');
    return (vapidReady = false);
  }
  const webpush = (await import('web-push')).default;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contact@job-conciergerie.fr', publicKey, privateKey);
  return (vapidReady = true);
};

export const sendPushToUser = async (
  userType: UserType,
  rowKey: string,
  payload: PushPayload,
): Promise<{ sent: number; subscribed: number | null }> => {
  if (!(await initVapid())) return { sent: 0, subscribed: null };
  // Push delivery is a Pro+ feature — subscriptions can't be created on lower
  // plans, and legacy rows (pre-gate / post-downgrade) stop receiving here.
  if (!PLAN_LIMITS[await getUserPlan(userType, rowKey)].advancedNotifications) return { sent: 0, subscribed: 0 };
  const subs = await getPushSubscriptionsFor(userType, rowKey);
  if (!subs.length) return { sent: 0, subscribed: 0 };

  const webpush = (await import('web-push')).default;
  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(
    subs.map(async sub => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription is gone for good — drop it
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`.catch(() => {});
        } else {
          console.error(`[push] send failed (${status ?? 'network'}) for ${sub.endpoint.slice(0, 60)}…:`, e);
        }
      }
    }),
  );
  return { sent, subscribed: subs.length };
};
