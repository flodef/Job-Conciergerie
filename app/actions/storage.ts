'use server';

import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

// Constants
const BUCKET_NAME = 'House images';

/**
 * Verifies if the current user is an authenticated Conciergerie
 * Returns the conciergerie ID if authorized, null otherwise
 */
async function verifyConciergerieAuth(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<string | null> {
  const supabase = createClient(cookieStore);

  try {
    // Get the current user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('Storage action: No authenticated user found');
      return null;
    }

    // Check if user exists in conciergerie table
    const { data: conciergerie, error: dbError } = await supabase
      .from('conciergerie')
      .select('id')
      .eq('id', user.id)
      .single();

    if (dbError || !conciergerie) {
      console.warn('Storage action: User is not a conciergerie');
      return null;
    }

    return conciergerie.id;
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
    console.error('Upload denied: Only conciergeries can upload images');
    return null;
  }

  const supabase = createClient(cookieStore);

  try {
    // Generate a unique file name if not provided
    const finalFileName = fileName || `JobConciergerie_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const filePath = `${finalFileName}.${file.type.split('/')[1] || 'jpg'}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error('Supabase storage upload error:', error);
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
  if (!conciergerieId) {
    console.error('Delete denied: Only conciergeries can delete images');
    return false;
  }

  const supabase = createClient(cookieStore);

  try {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

    if (error) {
      console.error('Supabase storage delete error:', error);
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
  if (!conciergerieId) {
    console.error('List denied: Only conciergeries can list files');
    return [];
  }

  const supabase = createClient(cookieStore);

  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list();

    if (error) {
      console.error('Supabase storage list error:', error);
      return [];
    }

    return data.map(item => item.name);
  } catch (error) {
    console.error('Error in listStorageFiles:', error);
    return [];
  }
}
