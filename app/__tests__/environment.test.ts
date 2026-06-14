import { afterEach, describe, expect, it } from 'vitest';

describe('isProduction', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns true when project ID is in DATABASE_URL (prod direct)', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://wztgngibrkdqelsdphjt.supabase.co';
    process.env.DATABASE_URL = 'postgresql://postgres:xxx@db.wztgngibrkdqelsdphjt.supabase.co:6543/postgres';

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(true);
  });

  it('returns true when project ID is in DATABASE_URL (prod pooler)', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://wztgngibrkdqelsdphjt.supabase.co';
    process.env.DATABASE_URL =
      'postgresql://postgres.wztgngibrkdqelsdphjt:xxx@aws-1-eu-west-3.pooler.supabase.com:5432/postgres';

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(true);
  });

  it('returns false when project ID is not in DATABASE_URL (dev)', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://wztgngibrkdqelsdphjt.supabase.co';
    process.env.DATABASE_URL = 'postgresql://postgres:xxx@db.differentprojectid.supabase.co:6543/postgres';

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(false);
  });

  it('returns false when NEXT_PUBLIC_SUPABASE_URL is invalid', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'invalid-url';
    process.env.DATABASE_URL = 'postgresql://postgres:xxx@db.wztgngibrkdqelsdphjt.supabase.co:6543/postgres';

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(false);
  });

  it('returns false when DATABASE_URL is not set', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://wztgngibrkdqelsdphjt.supabase.co';
    process.env.DATABASE_URL = '';

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(false);
  });
});
