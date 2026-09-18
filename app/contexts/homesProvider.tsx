'use client';

import { createNewHome, deleteHomeData, fetchAllHomes, updateHomeData } from '@/app/actions/home';
import { deleteFileFromSupabase } from '@/app/actions/storage';
import type { Toast } from '@/app/components/toastMessage';
import { ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useFetchTime } from '@/app/hooks/useFetchTime';
import { preloadImages } from '@/app/hooks/useImageCache';
import type { Home } from '@/app/types/dataTypes';
import { generateSecureId } from '@/app/utils/id';
import { navigationRoutes, Page } from '@/app/utils/navigation';
import { getStorageImageUrl } from '@/app/utils/storage';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type HomesContextType = {
  isLoading: boolean;
  homes: Home[];
  myHomes: Home[];
  fetchHomes: () => Promise<boolean>;
  addHome: (home: Omit<Home, 'id' | 'conciergerieName'>) => Promise<boolean>;
  updateHome: (home: Home) => Promise<boolean>;
  updateHomeLocal: (home: Home) => void;
  deleteHome: (id: string) => Promise<boolean>;
  homeExists: (title: string, id?: string) => boolean;
  // Incremental update functions for realtime sync
  addHomeFromRealtime: (home: Home) => void;
  updateHomeFromRealtime: (home: Home) => void;
  deleteHomeFromRealtime: (id: string) => void;
};

const HomesContext = createContext<HomesContextType | undefined>(undefined);

export function HomesProvider({ children }: { children: ReactNode }) {
  const { conciergerieName, isLoading: authLoading } = useAuth();
  const { needsRefresh, updateFetchTime } = useFetchTime();
  const needsRefreshHomes = needsRefresh[Page.Homes];

  const [isLoading, setIsLoading] = useState(false);
  const [homes, setHomes] = useState<Home[]>([]);
  const [toast, setToast] = useState<Toast>();

  // Keep a ref to the latest homes so the stable-deps fetch callback can decide
  // whether this is an initial load (no data) vs a silent background refresh.
  const homesRef = useRef<Home[]>([]);
  useEffect(() => {
    homesRef.current = homes;
  }, [homes]);

  // Show all homes for employees, only conciergerie's own homes for conciergeries
  const myHomes = useMemo(
    () => (conciergerieName ? homes.filter(home => home.conciergerieName === conciergerieName) : homes),
    [homes, conciergerieName],
  );

  // Core fetch logic shared between auto-fetch and manual refresh
  const isFetching = useRef(false);
  // Callers share the in-flight promise so a second call during a fetch gets
  // the real result instead of a false "failure".
  const inFlight = useRef<Promise<boolean> | null>(null);
  // Exponential backoff on failure: a permanently-failing session (pending,
  // expired, revoked) must not hammer the DB in a tight retry loop.
  const failuresRef = useRef(0);
  const lastFailureRef = useRef(0);

  const fetchHomesCore = useCallback((): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;

    const backoffMs = Math.min(5000 * 2 ** failuresRef.current, 5 * 60 * 1000);
    if (failuresRef.current > 0 && Date.now() - lastFailureRef.current < backoffMs) return Promise.resolve(false);
    const markFailure = () => {
      failuresRef.current++;
      lastFailureRef.current = Date.now();
    };

    // Skip fetching if offline - preserve existing data but reset needsRefresh
    if (!navigator.onLine) {
      console.warn('Offline mode: skipping homes fetch, using cached data');
      updateFetchTime(Page.Homes);
      return Promise.resolve(false);
    }

    isFetching.current = true;
    console.debug('Loading homes from database...');
    // Only show the spinner on the initial load (no data yet); background
    // refreshes update silently. Use the ref to avoid the stale closure.
    setIsLoading(homesRef.current.length === 0);

    // Kept for the final check below — the pool-exhausted toast must only
    // fire when the retry also failed, not on the first attempt.
    let lastError: unknown;
    const attempt = (): Promise<boolean> =>
      fetchAllHomes()
        .then(fetchedHomes => {
          if (fetchedHomes) {
            setHomes(fetchedHomes);
            updateFetchTime(Page.Homes);

            // Preload all home images in the background if enabled
            if (process.env.NEXT_PUBLIC_PRELOAD_IMAGES === 'true') {
              const allImageUrls = fetchedHomes.flatMap(home =>
                (home.images || []).map(img => getStorageImageUrl(img, { width: 400, quality: 80 })),
              );
              preloadImages(allImageUrls);
            }
          }
          return !!fetchedHomes;
        })
        .catch(error => {
          console.warn('Failed to fetch homes:', error);
          lastError = error;
          const errorMsg = error?.message?.toLowerCase() || '';
          const isMaxClientsError = errorMsg.includes('max clients') || errorMsg.includes('emaxconnsession');
          const is503Error =
            errorMsg.includes('unexpected') || errorMsg.includes('503') || errorMsg.includes('service unavailable');
          if (!navigator.onLine || is503Error || isMaxClientsError) {
            updateFetchTime(Page.Homes);
          }
          return false;
        });

    // One silent retry absorbs transient timeouts (cold DB resume, proxy
    // hiccup) — the error only surfaces if both attempts fail. Failure is
    // counted once per call so the retry isn't blocked by the backoff.
    const promise = attempt()
      .then(ok => ok || attempt())
      .then(ok => {
        if (ok) {
          failuresRef.current = 0;
        } else {
          markFailure();
          const errorMsg = (lastError as Error)?.message?.toLowerCase() || '';
          if (errorMsg.includes('max clients') || errorMsg.includes('emaxconnsession')) {
            console.error('Database connection pool exhausted:', lastError);
            setToast({
              type: ToastType.Error,
              message: 'Trop de connexions simultanées. Veuillez réessayer dans quelques instants.',
              error: lastError,
            });
          }
        }
        return ok;
      })
      .finally(() => {
        isFetching.current = false;
        inFlight.current = null;
        setIsLoading(false);
      });
    inFlight.current = promise;
    return promise;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - uses refs and state setters which are stable

  const pathname = usePathname();

  // Fetch homes when needed (initial load or refresh triggered) - only for authenticated users on nav pages
  useEffect(() => {
    if (authLoading || !needsRefreshHomes || !conciergerieName) return;
    if (isFetching.current) return;
    if (!navigationRoutes.includes(pathname)) return;
    fetchHomesCore();
  }, [authLoading, needsRefreshHomes, conciergerieName, pathname, fetchHomesCore]);

  // Manual refresh function - exposes the core function
  const fetchHomes = useCallback(() => fetchHomesCore(), [fetchHomesCore]);

  // Check if a home with the same title already exists for the current conciergerie
  const homeExists = (title: string, id?: string): boolean => {
    return homes.some(
      home =>
        home.conciergerieName === conciergerieName &&
        (id ? home.id !== id : true) &&
        home.title.trim().toLowerCase() === title.trim().toLowerCase(),
    );
  };

  const addHome = async (homeData: Omit<Home, 'id' | 'conciergerieName'>) => {
    // Check if a home with the same title already exists
    if (!conciergerieName || homeExists(homeData.title)) return false;

    const newHome: Home = {
      ...homeData,
      id: generateSecureId(),
      conciergerieName,
    };

    const createdHome = await createNewHome(newHome);
    if (!createdHome) return false;

    // Guard against a duplicate entry: the realtime INSERT event for this very
    // home may have already been applied to state before this runs. Appending
    // unconditionally would then show the SAME home twice, and deleting one of
    // those cards would delete the single underlying row (data loss).
    setHomes(prev => (prev.some(h => h.id === createdHome.id) ? prev : [...prev, createdHome]));
    return true;
  };

  const updateHome = async (updatedHome: Home) => {
    if (
      !conciergerieName ||
      !updatedHome.id ||
      updatedHome.conciergerieName !== conciergerieName ||
      homeExists(updatedHome.title, updatedHome.id)
    )
      return false;

    const updated = await updateHomeData(updatedHome.id, updatedHome);
    if (!updated) return false;

    setHomes(prev => prev.map(home => (home.id === updatedHome.id ? { ...updated } : home)));
    return true;
  };

  const updateHomeLocal = (updatedHome: Home) => {
    setHomes(prev => prev.map(home => (home.id === updatedHome.id ? { ...updatedHome } : home)));
  };

  const deleteHome = async (id: string) => {
    const homeToDelete = homes.find(h => h.id === id && h.conciergerieName === conciergerieName);

    if (!homeToDelete) return false;

    const deleted = await deleteHomeData(id);
    if (!deleted) return false;

    homeToDelete.images.forEach(async img => await deleteFileFromSupabase(img));

    setHomes(prev => prev.filter(home => home.id !== id));
    return true;
  };

  // Incremental update functions for realtime sync
  const addHomeFromRealtime = useCallback((home: Home) => {
    setHomes(prev => (prev.some(h => h.id === home.id) ? prev : [...prev, home]));
  }, []);

  const updateHomeFromRealtime = useCallback((home: Home) => {
    setHomes(prev => prev.map(h => (h.id === home.id ? home : h)));
  }, []);

  const deleteHomeFromRealtime = useCallback((id: string) => {
    setHomes(prev => prev.filter(h => h.id !== id));
  }, []);

  return (
    <HomesContext.Provider
      value={{
        isLoading,
        homes,
        myHomes,
        fetchHomes,
        addHome,
        updateHome,
        updateHomeLocal,
        deleteHome,
        homeExists,
        addHomeFromRealtime,
        updateHomeFromRealtime,
        deleteHomeFromRealtime,
      }}
    >
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} closable />
      {children}
    </HomesContext.Provider>
  );
}

export function useHomes() {
  const context = useContext(HomesContext);
  if (context === undefined) {
    throw new Error('useHomes must be used within a HomesProvider');
  }
  return context;
}
