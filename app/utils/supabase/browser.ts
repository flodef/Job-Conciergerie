import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let browserClient: SupabaseClient | undefined;

/**
 * Singleton Supabase browser client used for Realtime subscriptions.
 * Returns undefined if the Supabase env variables are not configured.
 */
export const getBrowserClient = (): SupabaseClient | undefined => {
  if (typeof window === 'undefined') return undefined;
  if (!supabaseUrl || !supabaseKey) return undefined;
  if (!browserClient) browserClient = createBrowserClient(supabaseUrl, supabaseKey);
  return browserClient;
};
