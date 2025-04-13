'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Page } from '@/app/utils/navigation';
import { pageSettings } from '@/app/components/navigationLayout';

const AUTO_REFRESH_INTERVAL = 60 * 1000; // 1 minute
const STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes

type FetchTimeContextType = {
  lastFetchTime: Partial<Record<Page, Date>>;
  updateFetchTime: (page: Page) => void;
  needsRefresh: Partial<Record<Page, boolean>>;
};

const FetchTimeContext = createContext<FetchTimeContextType | undefined>(undefined);

// Function to initialize needsRefresh based on pageSettings
const initializeNeedsRefresh = (): Partial<Record<Page, boolean>> => {
  const initialRefresh: Partial<Record<Page, boolean>> = {};
  Object.entries(pageSettings).forEach(([page, settings]) => {
    if (settings.useFetchTime) {
      initialRefresh[page as Page] = true;
    }
  });
  return initialRefresh;
};

export const FetchTimeProvider = ({ children }: { children: ReactNode }) => {
  const [lastFetchTime, setLastFetchTime] = useState<Partial<Record<Page, Date>>>({});
  const [needsRefresh, setNeedsRefresh] = useState<Partial<Record<Page, boolean>>>(initializeNeedsRefresh());

  // Function to update fetch time for a specific page
  const updateFetchTime = (page: Page) => {
    setLastFetchTime(prev => ({ ...prev, [page]: new Date() }));
    setNeedsRefresh(prev => ({ ...prev, [page]: false }));
  };

  // Auto-refresh logic: Check every minute if data is stale (older than 10 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      Object.entries(lastFetchTime).forEach(([page, time]) => {
        if (time && now.getTime() - time.getTime() > STALE_THRESHOLD) {
          setNeedsRefresh(prev => ({ ...prev, [page]: true }));
          console.log(`Data for ${page} is stale, should refresh`);
          // For now, we'll just log; actual refresh will be handled in page components
        }
      });
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [lastFetchTime]);

  return (
    <FetchTimeContext.Provider value={{ lastFetchTime, updateFetchTime, needsRefresh }}>
      {children}
    </FetchTimeContext.Provider>
  );
};

export const useFetchTime = () => {
  const context = useContext(FetchTimeContext);
  if (context === undefined) {
    throw new Error('useFetchTime must be used within a FetchTimeProvider');
  }
  return context;
};
