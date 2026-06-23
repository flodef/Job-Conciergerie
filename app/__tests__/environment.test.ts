import { afterEach, describe, expect, it } from 'vitest';

describe('isProduction', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns true when prod project ID is in DATABASE_URL (direct)', async () => {
    process.env.PROD_SUPABASE_PROJECT_ID = 'wztgngibrkdqelsdphjt';
    process.env.DATABASE_URL = 'postgresql://postgres:xxx@db.wztgngibrkdqelsdphjt.supabase.co:6543/postgres';

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(true);
  });

  it('returns true when prod project ID is in DATABASE_URL (pooler)', async () => {
    process.env.PROD_SUPABASE_PROJECT_ID = 'wztgngibrkdqelsdphjt';
    process.env.DATABASE_URL =
      'postgresql://postgres.wztgngibrkdqelsdphjt:xxx@aws-1-eu-west-3.pooler.supabase.com:5432/postgres';

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(true);
  });

  it('returns false when DATABASE_URL points to a different (dev) project', async () => {
    process.env.PROD_SUPABASE_PROJECT_ID = 'wztgngibrkdqelsdphjt';
    process.env.DATABASE_URL = 'postgresql://postgres:xxx@db.differentprojectid.supabase.co:6543/postgres';

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(false);
  });

  it('throws an error when PROD_SUPABASE_PROJECT_ID is not set', async () => {
    delete process.env.PROD_SUPABASE_PROJECT_ID;
    process.env.DATABASE_URL = 'postgresql://postgres:xxx@db.wztgngibrkdqelsdphjt.supabase.co:6543/postgres';

    const { isProduction } = await import('@/app/actions/environment');
    await expect(isProduction()).rejects.toThrow(
      'DATABASE_URL or PROD_SUPABASE_PROJECT_ID environment variable is not set. Please add it to your .env.local file.',
    );
  });

  it('returns false when DATABASE_URL is not set', async () => {
    process.env.PROD_SUPABASE_PROJECT_ID = 'wztgngibrkdqelsdphjt';
    process.env.DATABASE_URL = '';

    const { isProduction } = await import('@/app/actions/environment');

    await expect(isProduction()).rejects.toThrow(
      'DATABASE_URL or PROD_SUPABASE_PROJECT_ID environment variable is not set. Please add it to your .env.local file.',
    );
  });
});
