import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getStorageImageUrl, getStorageFileName, fallbackImage } from '@/app/utils/storage';

describe('Storage Utilities', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });

  describe('fallbackImage', () => {
    it('should have correct fallback image path', () => {
      expect(fallbackImage).toBe('/home.webp');
    });
  });

  describe('getStorageImageUrl', () => {
    it('should construct URL with encoded bucket name', () => {
      const filePath = 'MENTHEREGLISSE/Studio 0.jpg';
      const url = getStorageImageUrl(filePath);

      expect(url).toBe(
        'https://test.supabase.co/storage/v1/object/public/House%20images/MENTHEREGLISSE/Studio%200.jpg',
      );
    });

    it('should handle filePath with multiple folders', () => {
      const filePath = 'CMD Breizh/Home Name 1.jpg';
      const url = getStorageImageUrl(filePath);

      expect(url).toContain('House%20images');
      expect(url).toContain('CMD%20Breizh');
      expect(url).toContain('Home%20Name%201.jpg');
    });

    it('should return full URL unchanged', () => {
      const fullUrl = 'https://example.com/path/to/image.jpg';
      const result = getStorageImageUrl(fullUrl);

      expect(result).toBe(fullUrl);
    });

    it('should return fallback when SUPABASE_URL is missing', () => {
      const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';

      const result = getStorageImageUrl('test.jpg');

      expect(result).toBe(fallbackImage);

      process.env.NEXT_PUBLIC_SUPABASE_URL = original;
    });
  });

  describe('getStorageFileName', () => {
    it('should extract filename from simple path', () => {
      const result = getStorageFileName('folder/image.jpg');
      expect(result).toBe('image.jpg');
    });

    it('should extract filename from full URL', () => {
      const url = 'https://test.supabase.co/storage/v1/object/public/House%20images/MENTHEREGLISSE/Studio%200.jpg';
      const result = getStorageFileName(url);
      expect(result).toBe('Studio%200.jpg');
    });

    it('should return empty string for empty input', () => {
      expect(getStorageFileName('')).toBe('');
    });

    it('should handle paths without folders', () => {
      expect(getStorageFileName('image.jpg')).toBe('image.jpg');
    });

    it('should handle paths with many nested folders', () => {
      const result = getStorageFileName('a/b/c/d/e/image.png');
      expect(result).toBe('image.png');
    });
  });
});
