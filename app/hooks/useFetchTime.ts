'use client';

import { useEffect, useCallback, useSyncExternalStore } from 'react';
import type { Page } from '@/app/utils/navigation';
import { navigationPages } from '@/app/utils/navigation';

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes (increased from 1 min to save Neon CU)
const STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes (increased from 5 min to save Neon CU)
const LAST_FETCH_STORAGE_KEY = 'fetch_time_last_fetch';

type FetchTimeState = {
  lastFetchTime: Partial<Record<Page, number>>;
  needsRefresh: Partial<Record<Page, boolean>>;
};

// Lazy import to avoid circular dependency during SSR
const getPageSettings = () => {
  // Dynamic import to avoid SSR issues
  const { pageSettings } = require('@/app/components/navigationLayout');
  return pageSettings as Record<Page, { icon: unknown; userType: string | undefined }>;
};

// Initialize needsRefresh based on pageSettings (lazy)
const initializeNeedsRefresh = (): Partial<Record<Page, boolean>> => {
  const initialRefresh: Partial<Record<Page, boolean>> = {};
  const pageSettings = getPageSettings();
  Object.entries(pageSettings).forEach(([page]) => {
    if (navigationPages.includes(page as Page)) {
      initialRefresh[page as Page] = true;
    }
  });
  return initialRefresh;
};

// Get lastFetchTime from localStorage (only runs on client)
const getStoredLastFetchTime = (): Partial<Record<Page, number>> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(LAST_FETCH_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Partial<Record<Page, number>>;
  } catch {
    // Invalid stored data
  }
  return {};
};

// Module-level shared state (singleton pattern) - initialized lazily
let sharedState: FetchTimeState | undefined;

const getSharedState = (): FetchTimeState => {
  if (!sharedState) {
    sharedState = {
      lastFetchTime: getStoredLastFetchTime(),
      needsRefresh: initializeNeedsRefresh(),
    };
  }
  return sharedState;
};

// Store subscribers (for pub/sub pattern)
const subscribers = new Set<() => void>();

// Notify all subscribers of state change
const notifySubscribers = () => subscribers.forEach(fn => fn());

// Update shared state and notify subscribers
const setSharedState = (updater: (prev: FetchTimeState) => FetchTimeState) => {
  const currentState = getSharedState();
  sharedState = updater(currentState);
  // Persist only lastFetchTime
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_FETCH_STORAGE_KEY, JSON.stringify(sharedState.lastFetchTime));
  }
  notifySubscribers();
};

// Subscribe to shared state changes (for useSyncExternalStore)
const subscribe = (callback: () => void) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

// Get current shared state (for useSyncExternalStore)
const getSnapshot = () => getSharedState();

// Check for stale data (runs on interval in the first hook instance)
const checkStale = () => {
  const state = getSharedState();
  const now = Date.now();
  let hasChanges = false;
  const newNeedsRefresh = { ...state.needsRefresh };

  Object.entries(state.lastFetchTime).forEach(([page, time]) => {
    if (time && now - time > STALE_THRESHOLD && !state.needsRefresh[page as Page]) {
      newNeedsRefresh[page as Page] = true;
      hasChanges = true;
      console.log(`Data for ${page} is stale, should refresh`);
    }
  });

  if (hasChanges) {
    setSharedState(prev => ({ ...prev, needsRefresh: newNeedsRefresh }));
  }
};

// Track if stale check interval is already running
let isIntervalRunning = false;

export function useFetchTime() {
  // Use useSyncExternalStore to subscribe to shared state
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Start stale check interval only once (on first hook mount)
  useEffect(() => {
    if (isIntervalRunning) return;
    isIntervalRunning = true;
    const interval = setInterval(checkStale, AUTO_REFRESH_INTERVAL);
    return () => {
      clearInterval(interval);
      isIntervalRunning = false;
    };
  }, []);

  // updateFetchTime updates shared state
  const updateFetchTime = useCallback((pages: Page | Page[]) => {
    const pageArray = Array.isArray(pages) ? pages : [pages];
    const now = Date.now();

    setSharedState(prev => {
      const newLastFetchTime = { ...prev.lastFetchTime };
      const newNeedsRefresh = { ...prev.needsRefresh };

      pageArray.forEach(page => {
        newLastFetchTime[page] = now;
        newNeedsRefresh[page] = false;
      });

      return {
        lastFetchTime: newLastFetchTime,
        needsRefresh: newNeedsRefresh,
      };
    });
  }, []);

  return {
    lastFetchTime: state.lastFetchTime,
    needsRefresh: state.needsRefresh,
    updateFetchTime,
  };
}
