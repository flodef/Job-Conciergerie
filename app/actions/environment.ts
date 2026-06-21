'use server';

/**
 * Server action to determine if the app is running in production
 * Returns true if the fixed production Supabase project ref (PROD_SUPABASE_PROJECT_ID)
 * is present in DATABASE_URL. This stays correct even when NEXT_PUBLIC_SUPABASE_URL and
 * DATABASE_URL point to the same project (required for Realtime).
 *
 * Throws an error if PROD_SUPABASE_PROJECT_ID is not set, as this is a required configuration.
 */
export async function isProduction(): Promise<boolean> {
  const prodProjectId = process.env.PROD_SUPABASE_PROJECT_ID;
  const dbURL = process.env.DATABASE_URL;
  if (!dbURL) throw new Error('DATABASE_URL environment variable is not set. Please add it to your .env.local file.');

  return prodProjectId ? dbURL.includes(prodProjectId) : false;
}

/**
 * Validates that NEXT_PUBLIC_SUPABASE_URL and DATABASE_URL point to the same Supabase project.
 * Logs an error if they don't match, which would cause Realtime to fail.
 */
export async function validateSupabaseConfig(): Promise<boolean> {
  const match = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/([a-z0-9]+)\.supabase\.co/);
  const supabaseProjectId = match?.[1] ?? null;
  return !!supabaseProjectId && (process.env.DATABASE_URL?.includes(supabaseProjectId) ?? false);
}
