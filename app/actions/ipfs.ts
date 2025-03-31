'use server';

// Constants
const IPFS_JWT = process.env.IPFS_JWT;
const IPFS_API_URL = process.env.NEXT_PUBLIC_IPFS_API_URL;
const PUBLIC_URL = process.env.NEXT_PUBLIC_IPFS_PUBLIC_URL;

/**
 * Uploads a file to IPFS via Pinata and returns the CID and file ID
 * The returned value format is "cid/id" which can be split to get individual values
 * @param file File to upload
 * @returns Promise<string> CID and file ID joined with a slash
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  if (!IPFS_JWT || !IPFS_API_URL) {
    console.error('IPFS environment variables not configured');
    throw new Error('IPFS environment variables not configured');
  }

  try {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('network', 'public');

    const res = await fetch(IPFS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${IPFS_JWT}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`IPFS upload error (${res.status}):`, errorBody);
      throw new Error(`IPFS upload failed: ${res.statusText}`);
    }

    const result = await res.json();

    if (!result.data || !result.data.cid || !result.data.id) {
      console.error('Pinata response missing data.cid or data.id:', result);
      throw new Error('Failed to get CID or ID from Pinata response');
    }

    // Return combined CID/ID format that can be split later
    return `${result.data.cid}/${result.data.id}`;
  } catch (error) {
    console.error('Error in uploadFileToIPFS:', error);
    const errorMessage = error instanceof Error ? error.message : 'IPFS upload failed';
    throw new Error(errorMessage);
  }
}

/**
 * Utility to get image URL from a CID/ID string
 * @param cidIdString The combined CID/ID string (format: "cid/id")
 * @returns The URL to access the image
 */
export function getIPFSImageUrl(cidIdString: string): string {
  const gatewayDomain = process.env.NEXT_PUBLIC_GATEWAY_DOMAIN;

  if (!gatewayDomain) {
    console.warn('Gateway domain not configured, using fallback image');
    return '/home.webp'; // Fallback image
  }

  // Extract the CID from the combined string (format: "cid/id")
  const cid = extractCID(cidIdString);
  if (!cid) {
    console.warn('Invalid CID/ID format', cidIdString);
    return '/home.webp'; // Fallback image
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
  return parts.length > 1 ? parts[1] : '';
}

/**
 * Delete a file from IPFS via Pinata
 * @param fileId The ID of the file to delete
 */
export async function deleteFileFromIPFS(fileId: string): Promise<void> {
  if (!IPFS_JWT || !PUBLIC_URL) {
    console.error('IPFS environment variables not configured');
    throw new Error('IPFS environment variables not configured');
  }

  try {
    const res = await fetch(`${PUBLIC_URL}${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${IPFS_JWT}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`IPFS delete error (${res.status}):`, errorBody);
      throw new Error(`IPFS delete failed: ${res.statusText}`);
    }
  } catch (error) {
    console.error('Error in deleteFileFromIPFS:', error);
    const errorMessage = error instanceof Error ? error.message : 'IPFS delete failed';
    throw new Error(errorMessage);
  }
}
