'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { useFetchTime } from '@/app/hooks/useFetchTime';
import { getBrowserClient } from '@/app/utils/supabase/browser';
import { Page } from '@/app/utils/navigation';
import { useEffect, useRef } from 'react';

// Small debounce so a burst of row changes (e.g. a bulk update) triggers a
// single refetch instead of many.
const DEBOUNCE_MS = 500;
// Health check interval
const HEALTH_CHECK_INTERVAL = 30 * 1000; // 30 seconds
// Max reconnection attempts before refreshing the app
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * Subscribe to Supabase Realtime (Postgres Changes) and flag the relevant
 * pages for a silent background refresh whenever a row changes in the
 * missions, homes, employees or conciergeries tables.
 *
 * This makes the data update almost instantly without polling. Includes
 * a health check that monitors the websocket connection and attempts to
 * reconnect if it drops. If reconnection fails after MAX_RECONNECT_ATTEMPTS,
 * the app is refreshed to restore the connection.
 */
export function useRealtimeSync() {
  const { triggerRefresh } = useFetchTime();
  const { userId, isLoading, fetchDataFromDatabase } = useAuth();

  // Keep the latest callbacks in refs so the subscription effect only depends
  // on userId/isLoading and does not resubscribe on every data change.
  const triggerRefreshRef = useRef(triggerRefresh);
  const fetchDataRef = useRef(fetchDataFromDatabase);
  const channelRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    triggerRefreshRef.current = triggerRefresh;
    fetchDataRef.current = fetchDataFromDatabase;
  }, [triggerRefresh, fetchDataFromDatabase]);

  const subscribe = () => {
    const supabase = getBrowserClient();
    if (!supabase) return;

    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    const debounce = (key: string, fn: () => void) => {
      if (timers[key]) clearTimeout(timers[key]);
      timers[key] = setTimeout(fn, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel('db-changes', { config: { broadcast: { ack: true } } })
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
      .subscribe(status => {
        console.log('[Realtime] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          reconnectAttemptsRef.current = 0;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('[Realtime] Connection lost, attempting to reconnect...');
          handleReconnect();
        }
      });

    channelRef.current = channel;

    // Start health check
    healthCheckIntervalRef.current = setInterval(() => {
      if (channelRef.current?.state !== 'joined') {
        console.log('[Realtime] Health check failed, connection not joined');
        handleReconnect();
      }
    }, HEALTH_CHECK_INTERVAL);

    return () => {
      Object.values(timers).forEach(clearTimeout);
      if (healthCheckIntervalRef.current) clearInterval(healthCheckIntervalRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  };

  const handleReconnect = () => {
    reconnectAttemptsRef.current += 1;
    const newAttempts = reconnectAttemptsRef.current;
    console.log(`[Realtime] Reconnection attempt ${newAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

    if (newAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[Realtime] Max reconnection attempts reached, refreshing app...');
      window.location.reload();
      return;
    }

    // Cleanup and resubscribe
    if (channelRef.current) {
      const supabase = getBrowserClient();
      if (supabase) supabase.removeChannel(channelRef.current);
    }
    if (healthCheckIntervalRef.current) clearInterval(healthCheckIntervalRef.current);

    // Delay before reconnecting
    setTimeout(() => {
      subscribe();
    }, 2000);
  };

  useEffect(() => {
    if (isLoading || !userId) return;

    const cleanup = subscribe();
    return () => {
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isLoading]);
}
