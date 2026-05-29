import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });
console.log('vitest.setup.ts loaded, DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 60));

// Set fallback mock values if not present in .env.local
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
}

// Ensure DATABASE_URL is set for database tests
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL not set in environment. Database tests will fail.');
}

// Force DATABASE_URL to be available for node environment tests
vi.stubEnv('DATABASE_URL', process.env.DATABASE_URL);
