'use server';

import { PLAN_LIMITS } from '@/app/data/plans';
import { getSessionPlan } from '@/app/db/planDb';
import {
  deletePushSubscription,
  deletePushSubscriptionsFor,
  savePushSubscription,
  sendPushToUser,
} from '@/app/db/pushDb';
import { checkRateLimit } from '@/app/db/rateLimit';
import { requireConnectedSession } from '@/app/db/session';
import { headers } from 'next/headers';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const isValidSubscription = (sub: PushSubscriptionInput) =>
  typeof sub?.endpoint === 'string' &&
  sub.endpoint.startsWith('https://') &&
  typeof sub.keys?.p256dh === 'string' &&
  typeof sub.keys?.auth === 'string';

/**
 * Register this device's push subscription for the connected user.
 * Identity always comes from the session — the client only supplies the
 * browser-generated endpoint + encryption keys.
 */
export async function saveMyPushSubscription(subscription: PushSubscriptionInput): Promise<boolean> {
  const session = await requireConnectedSession();
  if (!session?.userType || !session.rowKey || !isValidSubscription(subscription)) return false;
  if (!PLAN_LIMITS[await getSessionPlan(session)].advancedNotifications) return false;

  const userAgent = (await headers()).get('user-agent');
  return savePushSubscription(
    session.userType,
    session.rowKey,
    session.clientId,
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    userAgent,
  );
}

/** Unsubscribe the current device (endpoint-scoped delete). */
export async function removeMyPushSubscription(endpoint: string): Promise<boolean> {
  const session = await requireConnectedSession();
  if (!session?.userType || !session.rowKey || typeof endpoint !== 'string') return false;
  return deletePushSubscription(endpoint, session.userType, session.rowKey);
}

/** Turn push off account-wide — drops every subscribed device for this user. */
export async function clearMyPushSubscriptions(): Promise<boolean> {
  const session = await requireConnectedSession();
  if (!session?.userType || !session.rowKey) return false;
  return deletePushSubscriptionsFor(session.userType, session.rowKey);
}

/**
 * Send a test notification to every device subscribed by the connected user —
 * lets them see the real thing before keeping push enabled. Rate-limited per
 * user: each call fans out to every subscribed device.
 */
export async function sendTestPushNotification(): Promise<
  'sent' | 'no-subscription' | 'failed' | 'rate-limited' | 'unauthorized'
> {
  const session = await requireConnectedSession();
  if (!session?.userType || !session.rowKey) return 'unauthorized';
  if (!(await checkRateLimit('test-push', 10, 3600, `${session.userType}:${session.rowKey}`))) return 'rate-limited';
  const { sent, subscribed } = await sendPushToUser(session.userType, session.rowKey, {
    title: 'Notification de test',
    body: 'Les notifications fonctionnent sur cet appareil !',
    url: '/settings',
  });
  if (subscribed === null || (subscribed > 0 && sent === 0)) return 'failed';
  return sent > 0 ? 'sent' : 'no-subscription';
}
