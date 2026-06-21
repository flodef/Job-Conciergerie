'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { useFetchTime } from '@/app/hooks/useFetchTime';
import { getBrowserClient } from '@/app/utils/supabase/browser';
import { Page } from '@/app/utils/navigation';
import { useEffect, useRef } from 'react';

// Small debounce so a burst of row changes (e.g. a bulk update) triggers a
// single refetch instead of many.
const DEBOUNCE_MS = 500;

/**
 * Subscribe to Supabase Realtime (Postgres Changes) and flag the relevant
 * pages for a silent background refresh whenever a row changes in the
 * missions, homes, employees or conciergeries tables.
 *
 * This makes the data update almost instantly without polling. The existing
 * stale-poll in useFetchTime remains as a safety net in case the websocket
 * connection drops.
 */
export function useRealtimeSync() {
  const { triggerRefresh } = useFetchTime();
  const { userId, isLoading, fetchDataFromDatabase } = useAuth();

  // Keep the latest callbacks in refs so the subscription effect only depends
  // on userId/isLoading and does not resubscribe on every data change.
  const triggerRefreshRef = useRef(triggerRefresh);
  const fetchDataRef = useRef(fetchDataFromDatabase);
  useEffect(() => {
    triggerRefreshRef.current = triggerRefresh;
    fetchDataRef.current = fetchDataFromDatabase;
  }, [triggerRefresh, fetchDataFromDatabase]);

  useEffect(() => {
    if (isLoading || !userId) return;

    const supabase = getBrowserClient();
    if (!supabase) return;

    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    const debounce = (key: string, fn: () => void) => {
      if (timers[key]) clearTimeout(timers[key]);
      timers[key] = setTimeout(fn, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () =>
        debounce('missions', () => triggerRefreshRef.current([Page.Missions, Page.Calendar, Page.History])),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homes' }, () =>
        debounce('homes', () => triggerRefreshRef.current([Page.Homes, Page.Missions, Page.Calendar])),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () =>
        debounce('employees', () => {
          fetchDataRef.current('employee');
          triggerRefreshRef.current([Page.Missions, Page.Calendar, Page.Employees]);
        }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conciergeries' }, () =>
        debounce('conciergeries', () => fetchDataRef.current('conciergerie')),
      )
      .subscribe();

    return () => {
      Object.values(timers).forEach(clearTimeout);
      supabase.removeChannel(channel);
    };
  }, [userId, isLoading]);
}
