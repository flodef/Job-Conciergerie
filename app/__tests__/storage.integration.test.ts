import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  uploadFileToSupabase,
  deleteFileFromSupabase,
  getSupabaseImageUrl,
  listStorageFiles,
} from '@/app/actions/storage';

/**
 * Integration tests for Supabase Storage
 * These tests make actual calls to Supabase and require valid credentials
 *
 * To run these tests:
 * 1. Ensure you have valid Supabase credentials in your environment
 * 2. Run: bun test app/__tests__/storage.integration.test.ts
 *
 * Note: These tests will create and delete actual files in your Supabase storage
 */

describe('Supabase Storage Integration', () => {
  let testFilePath: string | null = null;
  const testFileName = `integration-test-${Date.now()}`;

  beforeAll(() => {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
      console.warn('Skipping integration tests - missing Supabase credentials');
    }
  });

  afterAll(async () => {
    // Cleanup: delete test file if it was created
    if (testFilePath) {
      await deleteFileFromSupabase(testFilePath);
    }
  });

  it('should connect to Supabase and list files', async () => {
    // This test will fail if Supabase is not configured
    const files = await listStorageFiles();

    // Should return an array (empty or with files)
    expect(Array.isArray(files)).toBe(true);
  });

  it('should upload a file to Supabase storage', async () => {
    // Create a test file
    const testContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic numbers
    const mockFile = new File([testContent], `${testFileName}.png`, { type: 'image/png' });

    const result = await uploadFileToSupabase(mockFile, testFileName);

    // Should return a file path
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');

    if (result) {
      testFilePath = result;
    }
  });

  it('should generate correct public URL for uploaded file', () => {
    if (!testFilePath) {
      console.warn('Skipping URL test - no file was uploaded');
      return;
    }

    const publicUrl = getSupabaseImageUrl(testFilePath);

    expect(publicUrl).toContain(process.env.NEXT_PUBLIC_SUPABASE_URL);
    expect(publicUrl).toContain('home-images');
    expect(publicUrl).toContain(testFilePath);
  });

  it('should delete a file from Supabase storage', async () => {
    if (!testFilePath) {
      console.warn('Skipping delete test - no file was uploaded');
      return;
    }

    const result = await deleteFileFromSupabase(testFilePath);

    expect(result).toBe(true);

    // Reset testFilePath since we've deleted it
    testFilePath = null;
  });

  it('should handle upload of a larger file', async () => {
    // Create a larger test file (1MB)
    const largerContent = new Uint8Array(1024 * 1024).fill(0);
    const mockFile = new File([largerContent], `large-test-${Date.now()}.bin`, {
      type: 'application/octet-stream',
    });

    const result = await uploadFileToSupabase(mockFile, `large-test-${Date.now()}`);

    // Should succeed with larger files
    expect(result).toBeTruthy();

    // Cleanup
    if (result) {
      await deleteFileFromSupabase(result);
    }
  });

  it('should handle multiple file uploads', async () => {
    const files: string[] = [];

    // Upload multiple small files
    for (let i = 0; i < 3; i++) {
      const content = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      const mockFile = new File([content], `multi-test-${Date.now()}-${i}.png`, { type: 'image/png' });

      const result = await uploadFileToSupabase(mockFile, `multi-test-${Date.now()}-${i}`);

      expect(result).toBeTruthy();
      if (result) files.push(result);
    }

    // Cleanup all uploaded files
    for (const filePath of files) {
      const deleted = await deleteFileFromSupabase(filePath);
      expect(deleted).toBe(true);
    }
  });
});
