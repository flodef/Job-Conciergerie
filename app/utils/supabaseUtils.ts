// Extracts the project ID from a Supabase URL
export function extractSupabaseProjectId(url: string): string | null {
  const match = url.match(/([a-z0-9]+)\.supabase\.co/);
  return match?.[1] ?? null;
}
