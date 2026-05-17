import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Set fallback mock values if not present in .env.local
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
}
