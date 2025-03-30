'use client';

import { createNewHome, deleteHomeData, fetchAllHomes, updateHomeData } from '@/app/actions/home';
import { useAuth } from '@/app/contexts/authProvider';
import { Home } from '@/app/types/dataTypes';
import { generateSimpleId } from '@/app/utils/id';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type HomesContextType = {
  isLoading: boolean;
  homes: Home[];
  myHomes: Home[];
  fetchHomes: () => Promise<boolean>;
  addHome: (home: Omit<Home, 'id' | 'conciergerieName'>) => Promise<boolean>;
  updateHome: (home: Home) => Promise<boolean>;
  deleteHome: (id: string) => Promise<boolean>;
  homeExists: (title: string) => boolean;
};

const HomesContext = createContext<HomesContextType | undefined>(undefined);

export function HomesProvider({ children }: { children: ReactNode }) {
  const { conciergerieName } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [homes, setHomes] = useState<Home[]>([]);

  const myHomes = useMemo(
    () => homes.filter(home => home.conciergerieName === conciergerieName),
    [homes, conciergerieName],
  );

  // Load homes from localStorage on initial render
  const fetchHomes = async () => {
    console.warn('Loading homes from database...');

    setIsLoading(homes.length === 0);
    const fetchedHomes = await fetchAllHomes();
    if (fetchedHomes) setHomes(fetchedHomes);

    setIsLoading(false);
    return !!fetchedHomes;
  };

  // Check if a home with the same title already exists for the current conciergerie
  const homeExists = (title: string): boolean => {
    return homes.some(
      home =>
        home.conciergerieName === conciergerieName && home.title.trim().toLowerCase() === title.trim().toLowerCase(),
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
      homeExists(updatedHome.title)
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
