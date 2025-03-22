'use client';

import { useAuth } from '@/app/contexts/authProvider';
import { HomeData } from '@/app/types/types';
import { generateSimpleId } from '@/app/utils/id';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type HomesContextType = {
  homes: HomeData[];
  isLoading: boolean;
  addHome: (home: Omit<HomeData, 'id' | 'modifiedDate' | 'conciergerieName'>) => boolean | void;
  updateHome: (home: HomeData) => void;
  deleteHome: (id: string) => void;
  homeExists: (title: string) => boolean;
};

const HomesContext = createContext<HomesContextType | undefined>(undefined);

export function HomesProvider({ children }: { children: ReactNode }) {
  const { conciergerieName } = useAuth();

  const [homes, setHomes] = useState<HomeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load homes from localStorage on initial render
  useEffect(() => {
    const loadHomes = async () => {
      setIsLoading(true);

      // Simulate a small delay to ensure localStorage is properly loaded
      // and to show the loading state for a better user experience
      await new Promise(resolve => setTimeout(resolve, 800));

      const savedHomes = localStorage.getItem('homes');
      if (savedHomes) {
        try {
          const parsedHomes = JSON.parse(savedHomes);
          // Convert string dates back to Date objects
          const homesWithDates = parsedHomes.map((home: HomeData) => ({
            ...home,
            modifiedDate: new Date(home.modifiedDate),
          }));
          setHomes(homesWithDates);
        } catch (error) {
          console.error('Failed to parse homes from localStorage', error);
        }
      }

      setIsLoading(false);
    };

    loadHomes();
  }, []);

  // Save homes to localStorage whenever they change
  useEffect(() => {
    if (homes.length > 0) {
      localStorage.setItem('homes', JSON.stringify(homes));
    }
  }, [homes]);

  // Check if a home with the same title already exists for the current conciergerie
  const homeExists = (title: string): boolean => {
    return homes.some(
      home =>
        home.conciergerieName === conciergerieName && home.title.trim().toLowerCase() === title.trim().toLowerCase(),
    );
  };

  const addHome = (homeData: Omit<HomeData, 'id' | 'modifiedDate' | 'conciergerieName'>) => {
    if (!conciergerieName) return;

    // Check if a home with the same title already exists
    if (homeExists(homeData.title)) {
      // Return false to indicate that the home wasn't added due to duplication
      return false;
    }

    const newHome: HomeData = {
      ...homeData,
      id: generateSimpleId(),
      modifiedDate: new Date(),
      conciergerieName,
    };

    setHomes(prev => [...prev, newHome]);
    return true; // Return true to indicate successful addition
  };

  const updateHome = (updatedHome: HomeData) => {
    if (!conciergerieName) return;

    // Only allow updates if the home was created by the current conciergerie
    if (updatedHome.conciergerieName === conciergerieName) {
      setHomes(prev =>
        prev.map(home => (home.id === updatedHome.id ? { ...updatedHome, modifiedDate: new Date() } : home)),
      );
    } else {
      console.error('Cannot update home: not created by current conciergerie');
    }
  };

  const deleteHome = (id: string) => {
    const homeToDelete = homes.find(h => h.id === id);

    // Only allow deletion if the home was created by the current conciergerie
    if (homeToDelete && homeToDelete.conciergerieName === conciergerieName) {
      // Remove the home from the array
      setHomes(prev => prev.filter(home => home.id !== id));

      // Update localStorage immediately to ensure the deletion is persisted
      const updatedHomes = homes.filter(home => home.id !== id);
      localStorage.setItem('homes', JSON.stringify(updatedHomes));
    } else {
      console.error('Cannot delete home: not created by current conciergerie');
    }
  };

  return (
    <HomesContext.Provider
      value={{
        homes,
        isLoading,
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
