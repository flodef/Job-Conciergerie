import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import {
  uploadFileToSupabase,
  deleteFileFromSupabase,
  getSupabaseImageUrl,
  listStorageFiles,
} from '@/app/actions/storage';
import { createClient } from '@/app/utils/supabase/server';

// Mock the cookies and supabase client
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    }),
  ),
}));

vi.mock('@/app/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Supabase Storage', () => {
  let mockStorageFrom: any;
  let mockSupabase: any;

  beforeAll(() => {
    // Create mock storage methods that chain properly
    mockStorageFrom = {
      upload: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
    };

    // Setup mock Supabase client with proper chaining
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      storage: {
        from: vi.fn(() => mockStorageFrom),
      },
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated conciergerie user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-user-id' }, error: null })),
        })),
      })),
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Environment', () => {
    it('should have required environment variables or use defaults', () => {
      // Set defaults if not present (test environment setup)
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      }
      if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
      }
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeDefined();
    });
  });

  describe('getSupabaseImageUrl', () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    beforeEach(() => {
      // Ensure env var is set for tests (except the fallback test)
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl || 'https://test.supabase.co';
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    });

    it('should return correct public URL for a file path', async () => {
      const filePath = 'test-image.jpg';
      const url = await getSupabaseImageUrl(filePath);

      expect(url).toContain(process.env.NEXT_PUBLIC_SUPABASE_URL);
      expect(url).toContain('House images'); // Bucket name with space (not URL-encoded in server action)
      expect(url).toContain(filePath);
    });

    it('should return the path as-is if it is already a full URL', async () => {
      const fullUrl = 'https://example.com/image.jpg';
      const result = await getSupabaseImageUrl(fullUrl);

      expect(result).toBe(fullUrl);
    });

    it('should return fallback image when SUPABASE_URL is not configured', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';

      const url = await getSupabaseImageUrl('test.jpg');

      expect(url).toBe('/home.webp');
    });
  });

  describe('uploadFileToSupabase', () => {
    it('should upload a file and return the file path', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const expectedPath = 'MENTHEREGLISSE/Test Home 0.jpg';

      mockStorageFrom.upload.mockResolvedValue({
        data: { path: expectedPath },
        error: null,
      });

      const result = await uploadFileToSupabase(mockFile, expectedPath);

      expect(result).toBe(expectedPath);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('House images');
      expect(mockStorageFrom.upload).toHaveBeenCalled();
    });

    it('should return null when user is not authenticated as conciergerie', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      // Simulate non-conciergerie user
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
          })),
        })),
      });

      const result = await uploadFileToSupabase(mockFile, 'test.jpg');

      expect(result).toBeNull();
    });

    it('should return null when upload fails', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      mockStorageFrom.upload.mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });

      const result = await uploadFileToSupabase(mockFile);

      expect(result).toBeNull();
    });

    it('should handle exceptions during upload', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      mockStorageFrom.upload.mockRejectedValue(new Error('Network error'));

      const result = await uploadFileToSupabase(mockFile);

      expect(result).toBeNull();
    });
  });

  describe('deleteFileFromSupabase', () => {
    it('should delete a file and return true on success', async () => {
      mockStorageFrom.remove.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await deleteFileFromSupabase('test-file.jpg');

      expect(result).toBe(true);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('House images');
      expect(mockStorageFrom.remove).toHaveBeenCalledWith(['test-file.jpg']);
    });

    it('should return false when user is not authenticated as conciergerie', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
          })),
        })),
      });

      const result = await deleteFileFromSupabase('test-file.jpg');

      expect(result).toBe(false);
    });

    it('should return false when deletion fails', async () => {
      mockStorageFrom.remove.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      const result = await deleteFileFromSupabase('non-existent.jpg');

      expect(result).toBe(false);
    });

    it('should handle exceptions during deletion', async () => {
      mockStorageFrom.remove.mockRejectedValue(new Error('Network error'));

      const result = await deleteFileFromSupabase('test.jpg');

      expect(result).toBe(false);
    });
  });

  describe('listStorageFiles', () => {
    it('should return a list of files', async () => {
      const mockFiles = [{ name: 'file1.jpg' }, { name: 'file2.png' }];

      mockStorageFrom.list.mockResolvedValue({
        data: mockFiles,
        error: null,
      });

      const result = await listStorageFiles();

      expect(result).toEqual(['file1.jpg', 'file2.png']);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('House images');
    });

    it('should return empty array when user is not authenticated as conciergerie', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Not found' } })),
          })),
        })),
      });

      const result = await listStorageFiles();

      expect(result).toEqual([]);
    });

    it('should return empty array when listing fails', async () => {
      mockStorageFrom.list.mockResolvedValue({
        data: null,
        error: { message: 'List failed' },
      });

      const result = await listStorageFiles();

      expect(result).toEqual([]);
    });

    it('should return empty array on exception', async () => {
      mockStorageFrom.list.mockRejectedValue(new Error('Network error'));

      const result = await listStorageFiles();

      expect(result).toEqual([]);
    });
  });
});
