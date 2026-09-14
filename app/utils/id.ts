const NEW_ID_CHAR = '$';
export const MAX_DEVICES = parseInt(process.env.NEXT_PUBLIC_MAX_DEVICES || '5');

/**
 * Prefix marking credentials generated with a cryptographically secure RNG.
 * Legacy ids (Math.random base36) have no prefix — they are rotated to this format server-side.
 */
export const V2_ID_PREFIX = 'v2_';

/**
 * Generate a cryptographically secure ID
 * @returns A `v2_`-prefixed ID with 128 bits of entropy
 */
export const generateSecureId = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return V2_ID_PREFIX + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate a unique ID
 * @returns A unique ID
 */
export async function generateUniqueId(): Promise<string> {
  return generateSecureId();
}

/**
 * Strip the new-device marker from an ID
 * @param id ID to normalize
 * @returns The base ID without the '$' marker
 */
export const baseId = (id: string) => id.replace(NEW_ID_CHAR, '');

/**
 * Format an ID
 * @param id ID to format
 * @returns Formatted ID
 */
export const formatId = (id: string) =>
  id.length <= 8
    ? id.replace(NEW_ID_CHAR, '')
    : `${id.replace(NEW_ID_CHAR, '').substring(0, 4)}...${id.substring(id.length - 4)}`;

/**
 * Check if an ID is in the list of IDs
 * @param ids List of IDs
 * @param id ID to check
 * @returns Whether the ID is in the list
 */
export const containsId = (ids: string[], id: string) =>
  ids.some(i => i.replace(NEW_ID_CHAR, '') === id.replace(NEW_ID_CHAR, ''));

/**
 * Check if an ID is a new device
 * @param id ID to check
 * @returns Whether the ID is a new device
 */
export const isNewDevice = (id: string) => id.startsWith(NEW_ID_CHAR);

/**
 * sha256 of a raw device id — mirrors `hashId` in db.ts but async
 * (WebCrypto is the only option in the browser). Device ids are stored
 * hashed at rest; the client computes this once to compare itself
 * against the hashed `id` arrays returned by the fetch actions.
 */
export const hashIdAsync = async (id: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Get the list of connected devices for a user
 * @param ids List of device IDs
 * @returns List of connected devices
 */
export function getConnectedDevices(ids: string[]): string[] {
  return ids.filter(id => !isNewDevice(id));
}

/**
 * Error thrown when the maximum number of devices is reached.
 * Carries the ID of the oldest connected device (the first one stored),
 * so the caller can prompt the user to confirm its eviction.
 */
export class MaxDevicesError extends Error {
  oldestDevice: string;
  constructor(oldestDevice: string) {
    super(`Nombre maximum d'appareils autorisés atteint (${MAX_DEVICES}).`);
    this.name = 'MaxDevicesError';
    this.oldestDevice = oldestDevice;
  }
}

/**
 * Bound a device-ids array to the invariant getDevices produces: at most
 * MAX_DEVICES-1 pending (`$`) entries and MAX_DEVICES connected entries,
 * relative order preserved within each class (pending first — same convention).
 * A plain slice(0, MAX_DEVICES) would silently drop pending entries appended
 * after a full set of connected devices.
 */
export const boundDeviceIds = (ids: string[]): string[] => [
  ...ids.filter(isNewDevice).slice(0, MAX_DEVICES - 1),
  ...ids.filter(i => !isNewDevice(i)).slice(0, MAX_DEVICES),
];

/**
 * Get the list of devices for a user
 * @param ids List of device IDs
 * @param userId User ID to add to the list
 * @param isNewDevice Whether the device is new
 * @param evictOldest If true, removes the oldest connected device when the limit is reached instead of throwing
 * @returns List of devices
 */
export function getDevices(ids: string[], userId: string, isNewDevice = false, evictOldest = false) {
  const alreadyConnected = getConnectedDevices(ids).includes(userId);
  const newId = isNewDevice && !alreadyConnected ? NEW_ID_CHAR + userId : userId;

  // Other devices' pending requests survive the update (the caller's own stale
  // pending entry is replaced). Capped to bound request spam.
  const pending = ids.filter(i => i.startsWith(NEW_ID_CHAR) && baseId(i) !== userId).slice(0, MAX_DEVICES - 1);
  let connectedDevices = getConnectedDevices(ids).filter(id => id !== userId);

  // The device limit only applies to connected devices — a pending request
  // doesn't consume a slot
  if (newId === userId && connectedDevices.length >= MAX_DEVICES) {
    if (!evictOldest) throw new MaxDevicesError(connectedDevices[0]);
    connectedDevices = connectedDevices.slice(1); // remove the oldest (first stored)
  }

  return [...pending, ...connectedDevices, newId];
}
