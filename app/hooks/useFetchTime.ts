'use client';

import { useState, useEffect, useCallback } from 'react';
import { navigationPages, Page } from '@/app/utils/navigation';
import { pageSettings } from '@/app/components/navigationLayout';

const AUTO_REFRESH_INTERVAL = 60 * 1000; // 1 minute
const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

type FetchTimeState = {
  lastFetchTime: Partial<Record<Page, number>>; // timestamps
  needsRefresh: Partial<Record<Page, boolean>>;
};

// Initialize needsRefresh based on pageSettings
const initializeNeedsRefresh = (): Partial<Record<Page, boolean>> => {
  const initialRefresh: Partial<Record<Page, boolean>> = {};
  Object.entries(pageSettings).forEach(([page]) => {
    if (navigationPages.includes(page as Page)) {
      initialRefresh[page as Page] = true;
    }
  });
  return initialRefresh;
};

// Only persist lastFetchTime to localStorage, not needsRefresh
// needsRefresh should always start as true on app load to trigger initial fetches
const LAST_FETCH_STORAGE_KEY = 'fetch_time_last_fetch';

const getInitialState = (): FetchTimeState => {
  let lastFetchTime: Partial<Record<Page, number>> = {};

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LAST_FETCH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Record<Page, number>>;
        lastFetchTime = parsed || {};
      }
    } catch {
      // Invalid stored data, use defaults
    }
  }

  // Always initialize needsRefresh to true - this ensures data is fetched on app load
  return { lastFetchTime, needsRefresh: initializeNeedsRefresh() };
};

export function useFetchTime() {
  const [state, setState] = useState<FetchTimeState>(getInitialState);

  // Persist only lastFetchTime to localStorage (not needsRefresh)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LAST_FETCH_STORAGE_KEY, JSON.stringify(state.lastFetchTime));
  }, [state.lastFetchTime]);

  // Auto-refresh logic: Check every minute if data is stale
  useEffect(() => {
    const checkStale = () => {
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
        setState(prev => ({ ...prev, needsRefresh: newNeedsRefresh }));
      }
    };

    const interval = setInterval(checkStale, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [state.lastFetchTime, state.needsRefresh]);

  const updateFetchTime = useCallback((pages: Page | Page[]) => {
    const pageArray = Array.isArray(pages) ? pages : [pages];
    const now = Date.now();

    setState(prev => {
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
