'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useFetchTime } from '@/app/hooks/useFetchTime';
import type { Home, Mission } from '@/app/types/dataTypes';
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
 * Realtime payloads deliver raw database rows in snake_case with string dates.
 * These helpers convert them to the app's camelCase types with Date objects,
 * matching what the server-side format functions produce.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatMissionFromRow = (row: any): Mission => ({
  id: row.id,
  homeId: row.home_id,
  tasks: row.tasks,
  startDateTime: new Date(row.start_date_time),
  endDateTime: new Date(row.end_date_time),
  employeeId: row.employee_id,
  employeeId2: row.employee_id_2,
  modifiedDate: new Date(row.modified_date),
  conciergerieName: row.conciergerie_name,
  status: row.status,
  allowedEmployees: row.allowed_employees,
  hours: Number(row.hours),
  allowDuo: row.allow_duo ?? false,
  travellers: row.travellers ?? 1,
  conciergerieComment: row.conciergerie_comment ?? undefined,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatHomeFromRow = (row: any): Home => ({
  id: row.id,
  title: row.title,
  description: row.description,
  objectives: row.objectives,
  images: row.images,
  geographicZone: row.geographic_zone,
  hoursOfCleaning: Number(row.hours_of_cleaning),
  hoursOfGardening: Number(row.hours_of_gardening),
  conciergerieName: row.conciergerie_name,
  allowDuo: row.allow_duo ?? false,
  maxTravellers: row.max_travellers ?? 1,
  notes: row.notes,
});

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
  const { addMissionFromRealtime, updateMissionFromRealtime, deleteMissionFromRealtime } = useMissions();
  const { addHomeFromRealtime, updateHomeFromRealtime, deleteHomeFromRealtime } = useHomes();

  // Keep the latest callbacks in refs so the subscription effect only depends
  // on userId/isLoading and does not resubscribe on every data change.
  const triggerRefreshRef = useRef(triggerRefresh);
  const fetchDataRef = useRef(fetchDataFromDatabase);
  const addMissionRef = useRef(addMissionFromRealtime);
  const updateMissionRef = useRef(updateMissionFromRealtime);
  const deleteMissionRef = useRef(deleteMissionFromRealtime);
  const addHomeRef = useRef(addHomeFromRealtime);
  const updateHomeRef = useRef(updateHomeFromRealtime);
  const deleteHomeRef = useRef(deleteHomeFromRealtime);
  const channelRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    triggerRefreshRef.current = triggerRefresh;
    fetchDataRef.current = fetchDataFromDatabase;
    addMissionRef.current = addMissionFromRealtime;
    updateMissionRef.current = updateMissionFromRealtime;
    deleteMissionRef.current = deleteMissionFromRealtime;
    addHomeRef.current = addHomeFromRealtime;
    updateHomeRef.current = updateHomeFromRealtime;
    deleteHomeRef.current = deleteHomeFromRealtime;
  }, [
    triggerRefresh,
    fetchDataFromDatabase,
    addMissionFromRealtime,
    updateMissionFromRealtime,
    deleteMissionFromRealtime,
    addHomeFromRealtime,
    updateHomeFromRealtime,
    deleteHomeFromRealtime,
  ]);

  const subscribe = () => {
    const supabase = getBrowserClient();
    if (!supabase) return;

    const timers: Record<string, ReturnType<typeof setTimeout>> = {};
    const debounce = (key: string, fn: () => void) => {
      if (timers[key]) clearTimeout(timers[key]);
      timers[key] = setTimeout(fn, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel('db-changes')
      // Single wildcard binding per table; dispatch on payload.eventType.
      // Multiple separate bindings (INSERT/UPDATE/DELETE) on the same channel
      // can silently break event delivery, so we keep one binding per table.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, payload => {
        if (payload.eventType === 'DELETE') {
          if (payload.old?.id) deleteMissionRef.current(payload.old.id);
        } else if (payload.new?.id) {
          const mission = formatMissionFromRow(payload.new);
          if (payload.eventType === 'INSERT') addMissionRef.current(mission);
          else updateMissionRef.current(mission);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homes' }, payload => {
        if (payload.eventType === 'DELETE') {
          if (payload.old?.id) deleteHomeRef.current(payload.old.id);
        } else if (payload.new?.id) {
          const home = formatHomeFromRow(payload.new);
          if (payload.eventType === 'INSERT') addHomeRef.current(home);
          else updateHomeRef.current(home);
        }
      })
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
