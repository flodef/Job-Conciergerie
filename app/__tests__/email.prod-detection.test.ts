import { extractSupabaseProjectId } from '@/app/utils/supabaseUtils';
import { describe, expect, it } from 'vitest';

describe('extractSupabaseProjectId', () => {
  it('extracts project ID from NEXT_PUBLIC_SUPABASE_URL', () => {
    expect(extractSupabaseProjectId('https://wztgngibrkdqelsdphjt.supabase.co')).toBe('wztgngibrkdqelsdphjt');
  });

  it('extracts project ID from direct DATABASE_URL (db.xxx.supabase.co)', () => {
    expect(
      extractSupabaseProjectId('postgresql://postgres:xxx@db.wztgngibrkdqelsdphjt.supabase.co:6543/postgres'),
    ).toBe('wztgngibrkdqelsdphjt');
  });

  it('returns null for invalid URLs', () => {
    expect(extractSupabaseProjectId('https://example.com')).toBeNull();
    expect(extractSupabaseProjectId('')).toBeNull();
  });

  it('handles different project IDs correctly', () => {
    expect(extractSupabaseProjectId('https://abc123def.supabase.co')).toBe('abc123def');
    expect(extractSupabaseProjectId('postgresql://postgres:pass@db.abc123def.supabase.co:5432/postgres')).toBe(
      'abc123def',
    );
  });
});

describe('isProd detection logic (string contains)', () => {
  it('returns true when project ID is in DATABASE_URL (prod direct)', () => {
    const supabaseProjectId = extractSupabaseProjectId('https://wztgngibrkdqelsdphjt.supabase.co');
    const databaseUrl = 'postgresql://postgres:xxx@db.wztgngibrkdqelsdphjt.supabase.co:6543/postgres';
    const isProd = !!supabaseProjectId && databaseUrl.includes(supabaseProjectId);
    expect(isProd).toBe(true);
  });

  it('returns true when project ID is in DATABASE_URL (prod pooler)', () => {
    const supabaseProjectId = extractSupabaseProjectId('https://wztgngibrkdqelsdphjt.supabase.co');
    const databaseUrl =
      'postgresql://postgres.wztgngibrkdqelsdphjt:xxx@aws-1-eu-west-3.pooler.supabase.com:5432/postgres';
    const isProd = !!supabaseProjectId && databaseUrl.includes(supabaseProjectId);
    expect(isProd).toBe(true);
  });

  it('returns false when project ID is not in DATABASE_URL (dev)', () => {
    const supabaseProjectId = extractSupabaseProjectId('https://wztgngibrkdqelsdphjt.supabase.co');
    const databaseUrl = 'postgresql://postgres:xxx@db.differentprojectid.supabase.co:6543/postgres';
    const isProd = !!supabaseProjectId && databaseUrl.includes(supabaseProjectId);
    expect(isProd).toBe(false);
  });

  it('returns false when project ID is null', () => {
    const supabaseProjectId = extractSupabaseProjectId('invalid-url');
    const databaseUrl = 'postgresql://postgres:xxx@db.wztgngibrkdqelsdphjt.supabase.co:6543/postgres';
    const isProd = !!supabaseProjectId && databaseUrl.includes(supabaseProjectId || '');
    expect(isProd).toBe(false);
  });
});
