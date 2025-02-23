'use client';

import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export enum Page {
  MissionsList = 'Liste des missions',
  MissionsHandling = 'Gestion des missions',
  HomesHandling = 'Gestion des biens',
  Settings = 'Paramètres',
  // GDPR = 'GDPR',
}
const defaultPage = Page.MissionsList;
export const pages = Object.values(Page);

// Map page enum to route paths
const routeMap: Record<Page, string> = {
  [Page.MissionsList]: '/',
  [Page.MissionsHandling]: '/missions',
  [Page.HomesHandling]: '/homes',
  [Page.Settings]: '/settings',
  // [Page.GDPR]: '/gdpr',
};

type MenuContext = {
  onMenuChange: (page?: Page) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (isMenuOpen: boolean) => void;
  currentPage: Page;
};

type MenuProviderProps = {
  children: ReactNode;
};

const MenuContext = createContext<MenuContext | undefined>(undefined);

export const MenuProvider = ({ children }: MenuProviderProps) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(defaultPage);

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab') as Page;

      setCurrentPage(tab && pages.includes(tab) ? tab : defaultPage);
    };

    // Initialize from URL on first load
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') as Page;
    if (initialTab && pages.includes(initialTab)) {
      setCurrentPage(initialTab);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const onMenuChange = (page = defaultPage) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
    router.push(routeMap[page]);
  };

  return (
    <MenuContext.Provider
      value={{
        onMenuChange,
        isMenuOpen,
        setIsMenuOpen,
        currentPage,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
};

export const useMenuContext = () => {
  const context = useContext(MenuContext);

  if (context === undefined) {
    throw new Error('useMenuContext must be used within a MenuProvider');
  }

  return context;
};
