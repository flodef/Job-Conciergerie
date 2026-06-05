import { describe, expect, it, vi } from 'vitest';

describe('isProduction', () => {
  it('returns true when project ID is in DATABASE_URL (prod direct)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://wztgngibrkdqelsdphjt.supabase.co');
    vi.stubEnv('DATABASE_URL', 'postgresql://postgres:xxx@db.wztgngibrkdqelsdphjt.supabase.co:6543/postgres');

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(true);

    vi.unstubAllEnvs();
  });

  it('returns true when project ID is in DATABASE_URL (prod pooler)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://wztgngibrkdqelsdphjt.supabase.co');
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://postgres.wztgngibrkdqelsdphjt:xxx@aws-1-eu-west-3.pooler.supabase.com:5432/postgres',
    );

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(true);

    vi.unstubAllEnvs();
  });

  it('returns false when project ID is not in DATABASE_URL (dev)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://wztgngibrkdqelsdphjt.supabase.co');
    vi.stubEnv('DATABASE_URL', 'postgresql://postgres:xxx@db.differentprojectid.supabase.co:6543/postgres');

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(false);

    vi.unstubAllEnvs();
  });

  it('returns false when NEXT_PUBLIC_SUPABASE_URL is invalid', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'invalid-url');
    vi.stubEnv('DATABASE_URL', 'postgresql://postgres:xxx@db.wztgngibrkdqelsdphjt.supabase.co:6543/postgres');

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(false);

    vi.unstubAllEnvs();
  });

  it('returns false when DATABASE_URL is not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://wztgngibrkdqelsdphjt.supabase.co');
    vi.stubEnv('DATABASE_URL', '');

    const { isProduction } = await import('@/app/actions/environment');
    const result = await isProduction();

    expect(result).toBe(false);

    vi.unstubAllEnvs();
  });
});
