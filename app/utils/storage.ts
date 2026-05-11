export const fallbackImage = '/home.webp';

/**
 * Utility to get image URL from a Supabase storage file path
 * @param filePath The file path in Supabase storage
 * @returns The URL to access the image
 */
export function getStorageImageUrl(filePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.warn('Supabase URL not configured, using fallback image');
    return fallbackImage;
  }

  // If the filePath is already a full URL, return it as-is
  if (filePath.startsWith('http')) {
    return filePath;
  }

  // URL-encode the bucket name (it contains a space) and file path segments
  const bucketName = encodeURIComponent('House images');
  // Encode each path segment separately to handle spaces in folder/file names
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${encodedPath}`;
}

/**
 * Extracts a clean file name from a file path or URL
 * This is useful for display purposes
 */
export function getStorageFileName(filePath: string): string {
  if (!filePath) return '';

  // If it's a URL, extract the path part
  if (filePath.startsWith('http')) {
    try {
      const url = new URL(filePath);
      const pathParts = url.pathname.split('/');
      return pathParts[pathParts.length - 1] || '';
    } catch {
      return filePath;
    }
  }

  // Otherwise just return the last part of the path
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
}
