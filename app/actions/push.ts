'use server';

import { deletePushSubscription, deletePushSubscriptionsFor, savePushSubscription } from '@/app/db/pushDb';
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
