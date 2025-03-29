'use client';

import { createNewHome, deleteHomeData, fetchHomesByConciergerieName, updateHomeData } from '@/app/actions/home';
import { useAuth } from '@/app/contexts/authProvider';
import { Home } from '@/app/types/dataTypes';
import { generateSimpleId } from '@/app/utils/id';
import { createContext, ReactNode, useContext, useState } from 'react';

type HomesContextType = {
  homes: Home[];
  isLoading: boolean;
  fetchHomes: () => Promise<boolean>;
  addHome: (home: Omit<Home, 'id' | 'conciergerieName'>) => Promise<boolean | void>;
  updateHome: (home: Home) => Promise<boolean>;
  deleteHome: (id: string) => Promise<boolean>;
  homeExists: (title: string) => boolean;
};

const HomesContext = createContext<HomesContextType | undefined>(undefined);

export function HomesProvider({ children }: { children: ReactNode }) {
  const { conciergerieName } = useAuth();

  const [homes, setHomes] = useState<Home[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load homes from localStorage on initial render
  const fetchHomes = async () => {
    setIsLoading(true);

    try {
      console.warn('Loading homes from database...');
      const fetchedHomes = await fetchHomesByConciergerieName(conciergerieName);
      setHomes(fetchedHomes);
      return true;
    } catch (error) {
      console.error('Failed to fetch homes from database', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if a home with the same title already exists for the current conciergerie
  const homeExists = (title: string): boolean => {
    return homes.some(
      home =>
        home.conciergerieName === conciergerieName && home.title.trim().toLowerCase() === title.trim().toLowerCase(),
    );
  };

  const addHome = async (homeData: Omit<Home, 'id' | 'conciergerieName'>) => {
    if (!conciergerieName) return;

    // Check if a home with the same title already exists
    if (homeExists(homeData.title)) {
      // Return false to indicate that the home wasn't added due to duplication
      return false;
    }

    const newHome: Home = {
      ...homeData,
      id: generateSimpleId(),
      conciergerieName,
    };

    const createdHome = await createNewHome(newHome);
    if (!createdHome) return;

    setHomes(prev => [...prev, createdHome]);

    return true; // Return true to indicate successful addition
  };

  const updateHome = async (updatedHome: Home) => {
    if (!conciergerieName) return false;

    // Only allow updates if the home was created by the current conciergerie
    if (updatedHome.conciergerieName === conciergerieName) {
      const updated = await updateHomeData(updatedHome.id, updatedHome);
      if (!updated) return false;

      setHomes(prev => prev.map(home => (home.id === updatedHome.id ? { ...updatedHome } : home)));
      return true; // Return true to indicate successful update
    } else {
      console.error('Cannot update home: not created by current conciergerie');
      return false;
    }
  };

  const deleteHome = async (id: string) => {
    const homeToDelete = homes.find(h => h.id === id);

    // Only allow deletion if the home was created by the current conciergerie
    if (homeToDelete && homeToDelete.conciergerieName === conciergerieName) {
      // Delete the home from the database
      const deleted = await deleteHomeData(id);
      if (!deleted) return false;

      // Remove the home from the array
      setHomes(prev => prev.filter(home => home.id !== id));
      return true; // Return true to indicate successful deletion
    } else {
      console.error('Cannot delete home: not created by current conciergerie');
      return false;
    }
  };

  return (
    <HomesContext.Provider
      value={{
        homes,
        isLoading,
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
