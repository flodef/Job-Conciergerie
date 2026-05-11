#!/usr/bin/env bun
/**
 * Migration script to transfer files from Pinata (IPFS) to Supabase Storage
 *
 * This script:
 * 1. Fetches all homes from the database
 * 2. For each home, downloads the images from Pinata using their CIDs
 * 3. Uploads the images to Supabase Storage
 * 4. Updates the database with the new Supabase file paths
 *
 * Usage: bun scripts/migrate-to-supabase.ts
 */

import { sql } from '@/app/db/db';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Constants
const BUCKET_NAME = 'House images';
const BATCH_SIZE = 5; // Process homes in batches to avoid overwhelming the APIs

// Initialize Supabase client (using service role key if available)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// IPFS/Pinata configuration (optional - public gateways will be used as fallback)
const IPFS_JWT = process.env.IPFS_JWT;
const GATEWAY_DOMAIN = process.env.NEXT_PUBLIC_GATEWAY_DOMAIN;

if (!GATEWAY_DOMAIN) {
  console.warn('Warning: NEXT_PUBLIC_GATEWAY_DOMAIN not set, will rely on public gateways only');
}

/**
 * Extract CID from a CID/ID string
 */
function extractCID(cidIdString: string): string {
  return cidIdString.split('/')[0] || cidIdString;
}

/**
 * Download a file from IPFS using multiple gateways
 * Tries Pinata first, then public gateways as fallbacks
 */
async function downloadFromIPFS(cidIdString: string): Promise<Buffer | null> {
  const cid = extractCID(cidIdString);

  // Skip invalid CIDs (local paths, etc.)
  if (!cid || cid.startsWith('/') || cid.includes('home.webp')) {
    console.log(`  Skipping invalid CID: ${cid}`);
    return null;
  }

  // List of gateways to try (Pinata first if configured, then public fallbacks)
  const gateways: string[] = [
    `https://ipfs.io/ipfs/${cid}`,
    `https://gateway.ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
  ];

  // Add Pinata gateway if configured
  if (GATEWAY_DOMAIN) {
    gateways.unshift(`https://${GATEWAY_DOMAIN.replace('https://', '').replace(/\/$/, '')}/ipfs/${cid}`);
  }

  for (const url of gateways) {
    try {
      console.log(`  Trying: ${url}`);
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        console.log(`  ✓ Downloaded successfully from ${url.split('/')[2]}`);
        return Buffer.from(arrayBuffer);
      }

      console.log(`  ✗ Failed (${response.status}) from ${url.split('/')[2]}`);
    } catch (error) {
      console.log(`  ✗ Error from ${url.split('/')[2]}: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  console.error(`  Failed to download from all gateways`);
  return null;
}

/**
 * Sanitize a string for use in file paths
 * Removes accents, special characters, and normalizes whitespace
 */
function sanitizeForPath(str: string): string {
  return str
    .normalize('NFD') // Decompose accented characters (é -> e + ́)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid path chars with dash
    .replace(/[^a-zA-Z0-9\-_.\s]/g, '-') // Replace other special chars with dash
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if a file already exists in the bucket
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const { data } = await supabase.storage.from(BUCKET_NAME).list(filePath.split('/')[0], {
      search: filePath.split('/').slice(1).join('/'),
    });
    return data?.some(item => item.name === filePath.split('/').pop()) || false;
  } catch {
    return false;
  }
}

/**
 * Upload a file to Supabase Storage with organized folder structure
 * Uses upsert to handle re-runs gracefully (overwrites if exists)
 */
async function uploadToSupabase(
  buffer: Buffer,
  conciergerieName: string,
  homeTitle: string,
  imageIndex: number,
  mimeType: string,
): Promise<string | null> {
  // Build the file path: "ConciergerieName/Home Title X.ext"
  const sanitizedConciergerie = sanitizeForPath(conciergerieName);
  const sanitizedHomeTitle = sanitizeForPath(homeTitle);
  const extension = mimeType.split('/')[1] || 'jpg';
  const filePath = `${sanitizedConciergerie}/${sanitizedHomeTitle} ${imageIndex}.${extension}`;

  // Check if file already exists
  const exists = await fileExists(filePath);
  if (exists) {
    console.log(`    -> File already exists, skipping: ${filePath}`);
    return filePath;
  }

  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true, // Overwrite if exists (for re-runs)
    });

    if (error) {
      console.error(`  Supabase upload error: ${error.message}`);
      return null;
    }

    return data.path;
  } catch (error) {
    console.error(`  Error uploading to Supabase: ${error}`);
    return null;
  }
}

/**
 * Update a home's images in the database
 */
async function updateHomeImages(homeId: string, newImagePaths: string[]): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE homes
      SET images = ${newImagePaths}
      WHERE id = ${homeId}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    console.error(`  Error updating home ${homeId}: ${error}`);
    return false;
  }
}

/**
 * Migrate a single home's images
 */
async function migrateHome(
  home: { id: string; title: string; images: string[] },
  conciergerieName: string,
): Promise<{
  success: boolean;
  migrated: number;
  failed: number;
  newPaths: string[];
}> {
  console.log(`\nMigrating home: "${home.title}" (${home.id}) [${conciergerieName}]`);
  console.log(`  Found ${home.images.length} image(s)`);

  const newPaths: string[] = [];
  let migrated = 0;
  let failed = 0;

  for (let i = 0; i < home.images.length; i++) {
    const oldPath = home.images[i];
    console.log(`  [${i + 1}/${home.images.length}] Processing: ${oldPath.substring(0, 50)}...`);

    // Check if it's an IPFS CID (starts with Qm for CIDv0 or baf for CIDv1)
    const isIPFSCid = oldPath.startsWith('Qm') || oldPath.startsWith('baf');

    // Skip if it's already a Supabase path (not an IPFS CID and contains '/')
    if (!isIPFSCid && oldPath.includes('/')) {
      console.log(`    -> Already appears to be in Supabase format, skipping`);
      newPaths.push(oldPath);
      continue;
    }

    // Skip if it doesn't look like a valid source
    if (!isIPFSCid) {
      console.log(`    -> Unrecognized format, keeping as-is`);
      newPaths.push(oldPath);
      continue;
    }

    // Download from IPFS
    const buffer = await downloadFromIPFS(oldPath);
    if (!buffer) {
      console.log(`    -> Failed to download, keeping original reference`);
      newPaths.push(oldPath);
      failed++;
      continue;
    }

    // Detect mime type (simple approach)
    let mimeType = 'image/jpeg';
    if (oldPath.toLowerCase().endsWith('.png')) mimeType = 'image/png';
    else if (oldPath.toLowerCase().endsWith('.gif')) mimeType = 'image/gif';
    else if (oldPath.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';

    // Upload to Supabase with organized structure
    const newPath = await uploadToSupabase(buffer, conciergerieName, home.title, i, mimeType);
    if (!newPath) {
      console.log(`    -> Failed to upload to Supabase, keeping original reference`);
      newPaths.push(oldPath);
      failed++;
      continue;
    }

    console.log(`    -> Migrated to: ${newPath}`);
    newPaths.push(newPath);
    migrated++;

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Update the database if any images were migrated
  if (migrated > 0) {
    const updated = await updateHomeImages(home.id, newPaths);
    if (updated) {
      console.log(`  -> Database updated successfully`);
    } else {
      console.error(`  -> Failed to update database!`);
      return { success: false, migrated, failed, newPaths: [] };
    }
  }

  return { success: true, migrated, failed, newPaths };
}

/**
 * Main migration function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Starting migration from Pinata (IPFS) to Supabase Storage');
  console.log('='.repeat(60));
  console.log(`\nSupabase URL: ${supabaseUrl}`);
  console.log(`Gateway Domain: ${GATEWAY_DOMAIN}`);
  console.log(`Bucket: ${BUCKET_NAME}`);

  // Ensure the bucket exists
  console.log('\nChecking/creating bucket...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.warn(`Warning: Could not list buckets (RLS policy may restrict this): ${bucketsError.message}`);
    console.log('Assuming bucket exists and continuing...');
  } else {
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (!bucketExists) {
      console.log(`Creating bucket: ${BUCKET_NAME}`);
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 52428800, // 50MB limit
      });

      if (createError) {
        console.error(`Error creating bucket: ${createError.message}`);
        console.log('You may need to create the bucket manually in the Supabase dashboard.');
        process.exit(1);
      }
      console.log('Bucket created successfully');
    } else {
      console.log('Bucket already exists');
    }
  }

  // Fetch all homes with their conciergerie names
  console.log('\nFetching homes from database...');
  const homes = await sql`
    SELECT h.id, h.title, h.images, c.name as conciergerie_name
    FROM homes h
    JOIN conciergeries c ON h.conciergerie_name = c.name
    WHERE h.images IS NOT NULL AND array_length(h.images, 1) > 0
  `;

  if (!homes || homes.length === 0) {
    console.log('No homes with images found in the database.');
    return;
  }

  console.log(`Found ${homes.length} home(s) with images\n`);

  // Statistics
  let totalHomes = homes.length;
  let successfulHomes = 0;
  let failedHomes = 0;
  let totalMigrated = 0;
  let totalFailed = 0;

  // Process homes in batches
  for (let i = 0; i < homes.length; i += BATCH_SIZE) {
    const batch = homes.slice(i, i + BATCH_SIZE) as {
      id: string;
      title: string;
      images: string[];
      conciergerie_name: string;
    }[];
    console.log(`\n--- Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(homes.length / BATCH_SIZE)} ---`);

    for (const home of batch) {
      const result = await migrateHome(home, home.conciergerie_name);

      if (result.success) {
        successfulHomes++;
        totalMigrated += result.migrated;
        totalFailed += result.failed;
      } else {
        failedHomes++;
        totalFailed += home.images.length;
      }

      // Delay between homes
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Delay between batches
    if (i + BATCH_SIZE < homes.length) {
      console.log(`\n--- Pausing for 2 seconds before next batch ---`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Complete!');
  console.log('='.repeat(60));
  console.log(`Total homes processed: ${totalHomes}`);
  console.log(`Successful: ${successfulHomes}`);
  console.log(`Failed: ${failedHomes}`);
  console.log(`Total images migrated: ${totalMigrated}`);
  console.log(`Total images failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.log('\nNote: Some images could not be migrated. The original IPFS references');
    console.log('have been kept in the database. You may want to retry those later or');
    console.log('manually migrate them.');
  }
}

// Run the migration
main()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
