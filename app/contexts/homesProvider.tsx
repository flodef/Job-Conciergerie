'use client';

import { createNewHome, deleteHomeData, fetchAllHomes, updateHomeData } from '@/app/actions/home';
import { deleteFileFromSupabase } from '@/app/actions/storage';
import { useAuth } from '@/app/contexts/authProvider';
import { useFetchTime } from '@/app/hooks/useFetchTime';
import { preloadImages } from '@/app/hooks/useImageCache';
import { Home } from '@/app/types/dataTypes';
import { generateSimpleId } from '@/app/utils/id';
import { Page } from '@/app/utils/navigation';
import { getStorageImageUrl } from '@/app/utils/storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type HomesContextType = {
  isLoading: boolean;
  homes: Home[];
  myHomes: Home[];
  fetchHomes: () => Promise<boolean>;
  addHome: (home: Omit<Home, 'id' | 'conciergerieName'>) => Promise<boolean>;
  updateHome: (home: Home) => Promise<boolean>;
  deleteHome: (id: string) => Promise<boolean>;
  homeExists: (title: string, id?: string) => boolean;
};

const HomesContext = createContext<HomesContextType | undefined>(undefined);

export function HomesProvider({ children }: { children: ReactNode }) {
  const { conciergerieName, isLoading: authLoading } = useAuth();
  const { needsRefresh, updateFetchTime } = useFetchTime();
  const needsRefreshHomes = needsRefresh[Page.Homes];

  const [isLoading, setIsLoading] = useState(false);
  const [homes, setHomes] = useState<Home[]>([]);

  // Show all homes for employees, only conciergerie's own homes for conciergeries
  const myHomes = useMemo(
    () => (conciergerieName ? homes.filter(home => home.conciergerieName === conciergerieName) : homes),
    [homes, conciergerieName],
  );

  // Fetch homes when needed (initial load or refresh triggered) - only for authenticated users
  const isFetching = useRef(false);
  useEffect(() => {
    if (authLoading || isFetching.current || !needsRefreshHomes || !conciergerieName) return;

    isFetching.current = true;
    console.warn('Loading homes from database...');
    setIsLoading(homes.length === 0);

    fetchAllHomes()
      .then(fetchedHomes => {
        if (fetchedHomes) {
          setHomes(fetchedHomes);
          updateFetchTime(Page.Homes);

          // Preload all home images in the background
          const allImageUrls = fetchedHomes.flatMap(home => (home.images || []).map(img => getStorageImageUrl(img)));
          preloadImages(allImageUrls);
        }
      })
      .finally(() => {
        setIsLoading(false);
        isFetching.current = false;
      });
  }, [authLoading, needsRefreshHomes, homes.length, updateFetchTime]);

  // Manual refresh function
  const fetchHomes = useCallback(async () => {
    if (isFetching.current) return false;

    isFetching.current = true;
    console.warn('Loading homes from database...');
    setIsLoading(homes.length === 0);

    const fetchedHomes = await fetchAllHomes();
    if (fetchedHomes) {
      setHomes(fetchedHomes);
      updateFetchTime(Page.Homes);

      // Preload all home images in the background
      const allImageUrls = fetchedHomes.flatMap(home => (home.images || []).map(img => getStorageImageUrl(img)));
      preloadImages(allImageUrls);
    }

    setIsLoading(false);
    isFetching.current = false;
    return !!fetchedHomes;
  }, [homes.length, updateFetchTime]);

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
      id: generateSimpleId(),
      conciergerieName,
    };

    const createdHome = await createNewHome(newHome);
    if (!createdHome) return false;

    setHomes(prev => [...prev, createdHome]);
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

  const deleteHome = async (id: string) => {
    const homeToDelete = homes.find(h => h.id === id && h.conciergerieName === conciergerieName);

    if (!homeToDelete) return false;

    const deleted = await deleteHomeData(id);
    if (!deleted) return false;

    homeToDelete.images.forEach(async img => await deleteFileFromSupabase(img));

    setHomes(prev => prev.filter(home => home.id !== id));
    return true;
  };

  return (
    <HomesContext.Provider
      value={{
        isLoading,
        homes,
        myHomes,
        fetchHomes,
        addHome,
        updateHome,
        deleteHome,
        homeExists,
      }}
    >
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
