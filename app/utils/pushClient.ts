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

// Brave blocks Google push services by default → pushManager.subscribe always
// throws. Detected via the navigator.brave API Brave exposes.
export const isBrave = () => typeof (navigator as { brave?: unknown }).brave !== 'undefined';

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

export type SubscribeResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: 'denied' | 'no-sw' | 'unsupported' | 'failed'; error?: unknown };

/**
 * Ask permission (if needed) then subscribe this device. The caller maps the
 * failure reason to an explanatory message.
 */
export const subscribeDeviceToPush = async (): Promise<SubscribeResult> => {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!isPushSupported() || !vapidKey) return { ok: false, reason: 'unsupported' };
  if (Notification.permission === 'default' && (await Notification.requestPermission()) !== 'granted')
    return { ok: false, reason: 'denied' };
  if (Notification.permission !== 'granted') return { ok: false, reason: 'denied' };
  try {
    const reg = await readyOrNull();
    if (!reg) return { ok: false, reason: 'no-sw' };
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    return { ok: true, subscription };
  } catch (error) {
    // Keep the real DOMException for diagnostics — e.g. AbortError when the
    // browser can't reach a push service (Brave, locked-down Firefox/Chrome).
    console.error('[push] pushManager.subscribe failed:', error);
    return { ok: false, reason: 'failed', error };
  }
};
