'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import { defaultPage, Page, pages, routeMap } from '@/app/utils/navigation';
import { useRouter } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

type MenuContext = {
  onMenuChange: (page?: Page) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (isMenuOpen: boolean) => void;
  currentPage: Page;
  setHasUnsavedChanges: (hasUnsavedChanges: boolean) => void;
  confirmationModal: ReactNode;
};

type MenuProviderProps = {
  children: ReactNode;
};

const MenuContext = createContext<MenuContext | undefined>(undefined);

export const MenuProvider = ({ children }: MenuProviderProps) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(defaultPage);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [shouldShowConfirmClose, setShouldShowConfirmClose] = useState(false);
  const [pendingPage, setPendingPage] = useState<Page>();

  // Initialize currentPage based on URL path when component mounts
  useEffect(() => {
    // Function to update currentPage based on pathname
    const updateCurrentPage = () => {
      const path = window.location.pathname;
      const page = Object.entries(routeMap).find(([key, route]) => key && route === path)?.[0] as Page | undefined;
      if (page) setCurrentPage(page);
    };

    // Run once on mount
    updateCurrentPage();

    // Add event listener for popstate (history navigation)
    window.addEventListener('popstate', updateCurrentPage);
    return () => {
      window.removeEventListener('popstate', updateCurrentPage);
    };
  }, []);

  const onMenuChange = useCallback(
    (page = defaultPage) => {
      setIsMenuOpen(false);
      if (!hasUnsavedChanges) {
        router.push(routeMap[page]);
        setCurrentPage(page);
        setPendingPage(undefined);
      } else {
        setShouldShowConfirmClose(true);
        setPendingPage(page);
      }
    },
    [hasUnsavedChanges, router, setPendingPage],
  );

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const page = pages.find(p => routeMap[p] === path);
      if (page !== undefined) onMenuChange(page);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onMenuChange]);

  useEffect(() => {
    if (!hasUnsavedChanges && pendingPage) onMenuChange(pendingPage);
  }, [hasUnsavedChanges, pendingPage, onMenuChange]);

  const confirmNavigation = (confirm: boolean) => {
    setShouldShowConfirmClose(false);

    if (confirm) {
      setHasUnsavedChanges(false);
    } else {
      setPendingPage(undefined);
    }
  };

  const confirmationModal = (
    <ConfirmationModal
      isOpen={shouldShowConfirmClose}
      onConfirm={() => confirmNavigation(true)}
      onCancel={() => confirmNavigation(false)}
      title="Modifications non enregistrées"
      message="Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?"
      confirmText="Quitter"
      cancelText="Annuler"
    />
  );

  return (
    <MenuContext.Provider
      value={{
        onMenuChange,
        isMenuOpen,
        setIsMenuOpen,
        currentPage,
        setHasUnsavedChanges,
        confirmationModal,
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
