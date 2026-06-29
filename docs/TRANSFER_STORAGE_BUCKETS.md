# Transferring Supabase Storage Buckets Between Projects

## Important Limitation

**Supabase does NOT provide a built-in way to transfer storage buckets between projects.** You cannot simply "move" a bucket from one project to another.

## Options for Transferring Photos

### Option 1: Manual Download/Upload (Recommended for small amounts)

1. **Download all files from source project:**
   - Go to Supabase Dashboard → Storage → "House images" bucket
   - Download each file manually, or use the Supabase CLI:
   ```bash
   supabase storage download --bucket-id "House images" --local-path ./downloaded-images
   ```

2. **Upload to destination project:**
   - Go to the new Supabase project's Storage section
   - Create the "House images" bucket (see `migrations/setup_storage_bucket.sql`)
   - Upload the downloaded files manually, or use CLI:
   ```bash
   supabase storage upload --bucket-id "House images" --local-path ./downloaded-images
   ```

### Option 2: Programmatic Transfer (Recommended for large amounts)

Create a script to transfer files programmatically:

```typescript
// scripts/transfer-storage.ts
import { createClient } from '@supabase/supabase-js';

const SOURCE_URL = 'https://xxx.supabase.co';
const SOURCE_KEY = 'your-source-service-role-key';
const DEST_URL = 'https://yyy.supabase.co';
const DEST_KEY = 'your-dest-service-role-key';

const sourceClient = createClient(SOURCE_URL, SOURCE_KEY);
const destClient = createClient(DEST_URL, DEST_KEY);

async function transferBucket() {
  // List all files in source bucket
  const { data: files, error } = await sourceClient.storage
    .from('House images')
    .list('', { limit: 1000 });
  
  if (error) {
    console.error('Error listing files:', error);
    return;
  }

  console.log(`Found ${files.length} files to transfer`);

  for (const file of files) {
    // Download file from source
    const { data: downloadData, error: downloadError } = await sourceClient.storage
      .from('House images')
      .download(file.name);
    
    if (downloadError) {
      console.error(`Error downloading ${file.name}:`, downloadError);
      continue;
    }

    // Upload to destination
    const { error: uploadError } = await destClient.storage
      .from('House images')
      .upload(file.name, downloadData, { upsert: true });
    
    if (uploadError) {
      console.error(`Error uploading ${file.name}:`, uploadError);
    } else {
      console.log(`Transferred: ${file.name}`);
    }
  }
}

transferBucket();
```

Run with:
```bash
bun scripts/transfer-storage.ts
```

### Option 3: Start Fresh (If photos are not critical)

If the photos in the dev environment are not critical (test data), you can simply:

1. Create the bucket in the new project (see `migrations/setup_storage_bucket.sql`)
2. Upload a few test images manually
3. Continue development

This is often the fastest approach for development environments.

## Step-by-Step for Your Situation

Since you have a production project with existing photos and want to set up a dev project:

1. **Create the bucket in dev:**
   - Go to Supabase Dashboard (dev project) → Storage
   - Click "Create a new bucket"
   - Name it: "House images"
   - Make it public
   - Click "Create bucket"

2. **Apply RLS policies:**
   - Run the SQL from `migrations/setup_storage_bucket.sql` in the dev project's SQL Editor

3. **Transfer photos (optional):**
   - If you need production photos in dev, use Option 1 or 2 above
   - If not, just upload a few test images manually

4. **Test the upload:**
   - Try completing a mission report again
   - Check console logs for `[uploadReportImageToSupabase]` messages
