import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { vi } from 'vitest';
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
  let uploadedFilePath: string | null = null;
  let mockSupabase: any;

  beforeAll(() => {
    // Setup mock Supabase client
    mockSupabase = {
      storage: {
        from: vi.fn(() => mockSupabase.storage),
        upload: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
        getPublicUrl: vi.fn(),
      },
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  describe('Connection', () => {
    it('should have required environment variables', () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeDefined();
    });

    it('should create a supabase client', async () => {
      const cookieStore = { getAll: () => [], set: () => {} };
      createClient(cookieStore as any);
      expect(createClient).toHaveBeenCalled();
    });
  });

  describe('getSupabaseImageUrl', () => {
    it('should return correct public URL for a file path', () => {
      const filePath = 'test-image.jpg';
      const url = getSupabaseImageUrl(filePath);

      expect(url).toContain(process.env.NEXT_PUBLIC_SUPABASE_URL);
      expect(url).toContain('home-images');
      expect(url).toContain(filePath);
    });

    it('should return the path as-is if it is already a full URL', () => {
      const fullUrl = 'https://example.com/image.jpg';
      const result = getSupabaseImageUrl(fullUrl);

      expect(result).toBe(fullUrl);
    });

    it('should return fallback image when SUPABASE_URL is not configured', () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';

      const url = getSupabaseImageUrl('test.jpg');

      expect(url).toBe('/home.webp');

      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    });
  });

  describe('uploadFileToSupabase', () => {
    it('should upload a file and return the file path', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const expectedPath = 'test_123.jpg';

      mockSupabase.storage.upload.mockResolvedValue({
        data: { path: expectedPath },
        error: null,
      });

      const result = await uploadFileToSupabase(mockFile, 'test_123');

      expect(result).toBe(expectedPath);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('home-images');
      expect(mockSupabase.storage.upload).toHaveBeenCalled();

      uploadedFilePath = result;
    });

    it('should return null when upload fails', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      mockSupabase.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      });

      const result = await uploadFileToSupabase(mockFile);

      expect(result).toBeNull();
    });

    it('should handle exceptions during upload', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      mockSupabase.storage.upload.mockRejectedValue(new Error('Network error'));

      const result = await uploadFileToSupabase(mockFile);

      expect(result).toBeNull();
    });
  });

  describe('deleteFileFromSupabase', () => {
    it('should delete a file and return true on success', async () => {
      mockSupabase.storage.remove.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await deleteFileFromSupabase('test-file.jpg');

      expect(result).toBe(true);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('home-images');
      expect(mockSupabase.storage.remove).toHaveBeenCalledWith(['test-file.jpg']);
    });

    it('should return false when deletion fails', async () => {
      mockSupabase.storage.remove.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      const result = await deleteFileFromSupabase('non-existent.jpg');

      expect(result).toBe(false);
    });

    it('should handle exceptions during deletion', async () => {
      mockSupabase.storage.remove.mockRejectedValue(new Error('Network error'));

      const result = await deleteFileFromSupabase('test.jpg');

      expect(result).toBe(false);
    });
  });

  describe('listStorageFiles', () => {
    it('should return a list of files', async () => {
      const mockFiles = [{ name: 'file1.jpg' }, { name: 'file2.png' }];

      mockSupabase.storage.list.mockResolvedValue({
        data: mockFiles,
        error: null,
      });

      const result = await listStorageFiles();

      expect(result).toEqual(['file1.jpg', 'file2.png']);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('home-images');
    });

    it('should return empty array when listing fails', async () => {
      mockSupabase.storage.list.mockResolvedValue({
        data: null,
        error: { message: 'List failed' },
      });

      const result = await listStorageFiles();

      expect(result).toEqual([]);
    });

    it('should return empty array on exception', async () => {
      mockSupabase.storage.list.mockRejectedValue(new Error('Network error'));

      const result = await listStorageFiles();

      expect(result).toEqual([]);
    });
  });
});
