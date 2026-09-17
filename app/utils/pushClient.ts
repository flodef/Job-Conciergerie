// Client-side web push helpers — used by notificationSettings.
// The subscription lives on the device/browser; the account-level `push` flag
// in notificationSettings decides whether the server sends to them.

const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as { standalone?: boolean }).standalone === true;

// `serviceWorker.ready` never settles when no SW is registered (e.g. dev,
// where registration is skipped) — race it so callers don't hang forever.
const readyOrNull = (): Promise<ServiceWorkerRegistration | null> =>
  Promise.race([navigator.serviceWorker.ready, new Promise<null>(r => setTimeout(() => r(null), 4000))]);

/** This device's current push subscription, if any. */
export const getDeviceSubscription = async (): Promise<PushSubscription | null> => {
  try {
    const reg = await readyOrNull();
    return (await reg?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
};

/**
 * Ask permission (if needed) then subscribe this device. Returns the
 * PushSubscription to persist server-side, or null — caller shows the reason.
 */
export const subscribeDeviceToPush = async (): Promise<PushSubscription | null> => {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!isPushSupported() || !vapidKey) return null;
  if (Notification.permission === 'default' && (await Notification.requestPermission()) !== 'granted') return null;
  if (Notification.permission !== 'granted') return null;
  try {
    const reg = await readyOrNull();
    if (!reg) return null;
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  } catch {
    return null;
  }
};

export const unsubscribeDevice = async (): Promise<void> => {
  const sub = await getDeviceSubscription();
  if (sub) await sub.unsubscribe().catch(() => {});
};
