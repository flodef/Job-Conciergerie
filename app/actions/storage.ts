'use server';

import { cookies } from 'next/headers';
import { createAdminClient } from '@/app/utils/supabase/server';

// Constants
const BUCKET_NAME = 'House images';

/**
 * Verifies if the current user is an authenticated Conciergerie
 * Returns the conciergerie ID if authorized, null otherwise
 */
async function verifyConciergerieAuth(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<string | null> {
  try {
    // Get user_id and user_type from cookies (custom auth system)
    const userId = cookieStore.get('user_id')?.value;
    const userType = cookieStore.get('user_type')?.value;

    if (!userId) {
      console.warn('Storage action: No user_id cookie found');
      return null;
    }

    // Check if user is a conciergerie
    if (userType !== 'conciergerie') return null;

    return userId;
  } catch (error) {
    console.error('Error verifying conciergerie auth:', error);
    return null;
  }
}

/**
 * Uploads a file to Supabase Storage and returns the file path
 * @param file File to upload
 * @param fileName Optional custom file name (defaults to a timestamp-based name)
 * @returns Promise<string> The file path in the bucket, or null if upload failed
 */
export async function uploadFileToSupabase(file: File, fileName?: string): Promise<string | null> {
  const cookieStore = await cookies();

  // Verify user is a conciergerie
  const conciergerieId = await verifyConciergerieAuth(cookieStore);
  if (!conciergerieId) {
    console.error(
      'Upload denied: Only conciergeries can upload images. User may not be logged in or not a conciergerie.',
    );
    return null;
  }

  // Use admin client to bypass RLS policies
  const supabase = createAdminClient();

  try {
    // Use provided fileName as the full path (includes folder structure and extension)
    // If no fileName provided, generate a simple timestamp-based name
    const filePath = fileName || `uploads/${Date.now()}_${Math.random().toString(36).substring(2, 15)}.jpg`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error('Upload failed:', error.message);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error('Error in uploadFileToSupabase:', error);
    return null;
  }
}

/**
 * Deletes a file from Supabase Storage
 * @param filePath The path of the file to delete in the bucket
 * @returns Promise<boolean> True if deletion was successful
 */
export async function deleteFileFromSupabase(filePath: string): Promise<boolean> {
  const cookieStore = await cookies();

  // Verify user is a conciergerie
  const conciergerieId = await verifyConciergerieAuth(cookieStore);
  if (!conciergerieId) return false;

  // Use admin client to bypass RLS policies
  const supabase = createAdminClient();

  try {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    if (error) {
      console.error('Delete failed:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in deleteFileFromSupabase:', error);
    return false;
  }
}

/**
 * Gets the public URL for a file in Supabase Storage
 * @param filePath The path of the file in the bucket
 * @returns The public URL to access the file
 */
export async function getSupabaseImageUrl(filePath: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.warn('Supabase URL not configured');
    return '/home.webp';
  }

  // If the filePath is already a full URL, return it as-is
  if (filePath.startsWith('http')) {
    return filePath;
  }

  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
}

/**
 * Lists all files in the home-images bucket
 * @returns Promise<string[]> Array of file paths, or empty array if error
 */
export async function listStorageFiles(): Promise<string[]> {
  const cookieStore = await cookies();

  // Verify user is a conciergerie
  const conciergerieId = await verifyConciergerieAuth(cookieStore);
  if (!conciergerieId) return [];

  // Use admin client to bypass RLS policies
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list();
    if (error) {
      console.error('List failed:', error.message);
      return [];
    }
    return data?.map((item: { name: string }) => item.name) ?? [];
  } catch (error) {
    console.error('Error in listStorageFiles:', error);
    return [];
  }
}
