'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Conciergerie, HomeData } from '../types/types';
import { generateSimpleId } from '../utils/id';
import { getWelcomeParams } from '../utils/welcomeParams';

type HomesContextType = {
  homes: HomeData[];
  isLoading: boolean;
  addHome: (home: Omit<HomeData, 'id' | 'modifiedDate' | 'deleted' | 'conciergerieName'>) => void;
  updateHome: (home: HomeData) => void;
  deleteHome: (id: string) => void;
  getCurrentConciergerie: () => Conciergerie | null;
  getConciergerieByName: (name: string) => Conciergerie | null;
};

const HomesContext = createContext<HomesContextType | undefined>(undefined);

export function HomesProvider({ children }: { children: ReactNode }) {
  const [homes, setHomes] = useState<HomeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current conciergerie from localStorage
  const getCurrentConciergerie = (): Conciergerie | null => {
    const { conciergerieData } = getWelcomeParams();
    return conciergerieData as Conciergerie | null;
  };

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

  const addHome = (homeData: Omit<HomeData, 'id' | 'modifiedDate' | 'deleted' | 'conciergerieName'>) => {
    const currentConciergerie = getCurrentConciergerie();

    if (!currentConciergerie) {
      console.error('No conciergerie found in localStorage');
      return;
    }

    const newHome: HomeData = {
      ...homeData,
      id: generateSimpleId(),
      modifiedDate: new Date(),
      deleted: false,
      conciergerieName: currentConciergerie.name,
    };

    setHomes(prev => [...prev, newHome]);
  };

  const updateHome = (updatedHome: HomeData) => {
    const currentConciergerie = getCurrentConciergerie();

    // Only allow updates if the home was created by the current conciergerie
    if (currentConciergerie && updatedHome.conciergerieName === currentConciergerie.name) {
      setHomes(prev =>
        prev.map(home => (home.id === updatedHome.id ? { ...updatedHome, modifiedDate: new Date() } : home)),
      );
    } else {
      console.error('Cannot update home: not created by current conciergerie');
    }
  };

  const deleteHome = (id: string) => {
    const homeToDelete = homes.find(h => h.id === id);
    const currentConciergerie = getCurrentConciergerie();

    // Only allow deletion if the home was created by the current conciergerie
    if (homeToDelete && currentConciergerie && homeToDelete.conciergerieName === currentConciergerie.name) {
      setHomes(prev =>
        prev.map(home => (home.id === id ? { ...home, deleted: true, modifiedDate: new Date() } : home)),
      );
    } else {
      console.error('Cannot delete home: not created by current conciergerie');
    }
  };

  // Helper function to get a conciergerie by name
  const getConciergerieByName = (name: string): Conciergerie | null => {
    // If the name matches the current conciergerie, return it
    const currentConciergerie = getCurrentConciergerie();
    if (currentConciergerie && currentConciergerie.name === name) {
      return currentConciergerie;
    }

    // Otherwise, we would need to fetch from a list of conciergeries
    // For now, return null if it's not the current conciergerie
    return null;
  };

  return (
    <HomesContext.Provider
      value={{
        homes,
        isLoading,
        addHome,
        updateHome,
        deleteHome,
        getCurrentConciergerie,
        getConciergerieByName,
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
