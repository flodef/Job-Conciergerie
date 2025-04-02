'use server';

import { extractID, getIpfsFileName } from '@/app/utils/ipfs';

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
export async function uploadFileToIPFS(file: File): Promise<string | null> {
  if (!IPFS_JWT || !IPFS_API_URL) {
    console.error('IPFS environment variables not configured');
    throw new Error('IPFS environment variables not configured');
  }

  try {
    const formData = new FormData();
    formData.append('file', file, getIpfsFileName());
    formData.append('network', 'public');

    const request = await fetch(IPFS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${IPFS_JWT}`,
        'Upload-Length': file.size.toString(), // Required for v3
      },
      body: formData,
    });

    if (!request.ok) {
      const errorBody = await request.text();
      console.error(`IPFS upload error (${request.status}):`, errorBody);
      throw new Error(`IPFS upload failed: ${request.statusText}`);
    }

    const result = await request.json();

    if (!result.data || !result.data.cid || !result.data.id) {
      console.error('Pinata response missing data.cid or data.id:', result);
      return null;
    }

    // Return combined CID/ID format that can be split later
    return `${result.data.cid}/${result.data.id}`;
  } catch (error) {
    console.error('Error in uploadFileToIPFS:', error);
    return null;
  }
}

/**
 * Delete a file from IPFS via Pinata
 * @param fileId The ID of the file to delete
 */
export async function deleteFileFromIPFS(fileId: string): Promise<boolean> {
  if (!IPFS_JWT || !PUBLIC_URL) {
    console.error('IPFS environment variables not configured');
    return false;
  }

  const id = extractID(fileId);

  try {
    const res = await fetch(`${PUBLIC_URL}${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${IPFS_JWT}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`IPFS delete error (${res.status}):`, errorBody);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in deleteFileFromIPFS:', error);
    return false;
  }
}
