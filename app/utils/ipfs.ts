import { toLocalDateString } from './date';

export const fallbackImage = process.env.NEXT_PUBLIC_FALLBACK_IMAGE_URL || '/home.webp';

/**
 * Utility to get image URL from a CID/ID string
 * @param cidIdString The combined CID/ID string (format: "cid/id")
 * @returns The URL to access the image
 */
export function getIPFSImageUrl(cidIdString: string): string {
  const gatewayDomain = process.env.NEXT_PUBLIC_GATEWAY_DOMAIN;

  if (!gatewayDomain) {
    console.warn('Gateway domain not configured, using fallback image');
    return fallbackImage;
  }

  // Extract the CID from the combined string (format: "cid/id")
  const cid = extractCID(cidIdString);
  if (!cid || cidIdString.startsWith('http')) {
    console.warn('Invalid CID/ID format', cidIdString);
    return !cid ? fallbackImage : cidIdString;
  }

  return `https://${gatewayDomain.replace('https://', '').replace(/\/$/, '')}/ipfs/${cid}`;
}

/**
 * Utility to extract just the CID part from a CID/ID string
 */
export function extractCID(cidIdString: string): string {
  return cidIdString.split('/')[0] || '';
}

/**
 * Utility to extract just the ID part from a CID/ID string
 */
export function extractID(cidIdString: string): string {
  const parts = cidIdString.split('/');
  return parts.length > 1 ? parts[1] : parts[0];
}

export function getIpfsFileName(): string {
  return `JobConciergerie_${toLocalDateString(new Date())}`;
}
