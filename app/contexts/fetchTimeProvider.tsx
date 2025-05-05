'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { navigationPages, Page } from '@/app/utils/navigation';
import { pageSettings } from '@/app/components/navigationLayout';

const AUTO_REFRESH_INTERVAL = 60 * 1000; // 1 minute
const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

type FetchTimeContextType = {
  lastFetchTime: Partial<Record<Page, Date>>;
  updateFetchTime: (pages: Page | Page[]) => void;
  needsRefresh: Partial<Record<Page, boolean>>;
};

const FetchTimeContext = createContext<FetchTimeContextType | undefined>(undefined);

// Function to initialize needsRefresh based on pageSettings
const initializeNeedsRefresh = (): Partial<Record<Page, boolean>> => {
  const initialRefresh: Partial<Record<Page, boolean>> = {};
  Object.entries(pageSettings).forEach(([page]) => {
    if (navigationPages.includes(page as Page)) {
      initialRefresh[page as Page] = true;
    }
  });
  return initialRefresh;
};

export const FetchTimeProvider = ({ children }: { children: ReactNode }) => {
  const [lastFetchTime, setLastFetchTime] = useState<Partial<Record<Page, Date>>>({});
  const [needsRefresh, setNeedsRefresh] = useState<Partial<Record<Page, boolean>>>(initializeNeedsRefresh());

  // Function to update fetch time for one or multiple pages
  const updateFetchTime = (pages: Page | Page[]) => {
    const pageArray = Array.isArray(pages) ? pages : [pages];
    const now = new Date();

    setLastFetchTime(prev => {
      const updated = { ...prev };
      pageArray.forEach(page => {
        updated[page] = now;
      });
      return updated;
    });

    setNeedsRefresh(prev => {
      const updated = { ...prev };
      pageArray.forEach(page => {
        updated[page] = false;
      });
      return updated;
    });
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
