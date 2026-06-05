'use server';

/**
 * Server action to determine if the app is running in production
 * Returns true if the Supabase project ID from NEXT_PUBLIC_SUPABASE_URL is present in DATABASE_URL
 */
export async function isProduction(): Promise<boolean> {
  const match = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/([a-z0-9]+)\.supabase\.co/);
  const supabaseProjectId = match?.[1] ?? null;
  return (!!supabaseProjectId && process.env.DATABASE_URL?.includes(supabaseProjectId)) ?? false;
}
