'use client';

import ConfirmationModal from '@/app/components/confirmationModal';
import { defaultPage, Page, pages, routeMap } from '@/app/utils/navigation';
import { usePathname, useRouter } from 'next/navigation';
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
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [shouldShowConfirmClose, setShouldShowConfirmClose] = useState(false);
  const [pendingPage, setPendingPage] = useState<Page>();

  // Derive currentPage from current pathname - always in sync with URL
  const currentPage = pathname
    ? (Object.entries(routeMap).find(([key, route]) => key && route === pathname)?.[0] as Page | undefined)
    : defaultPage;

  const onMenuChange = useCallback(
    (page = defaultPage) => {
      setIsMenuOpen(false);
      if (!hasUnsavedChanges) {
        router.push(routeMap[page]);
        setPendingPage(undefined);
      } else {
        setShouldShowConfirmClose(true);
        setPendingPage(page);
      }
    },
    [hasUnsavedChanges, router, setPendingPage],
  );

  // No need for popstate listener - currentPage is derived from pathname automatically

  useEffect(() => {
    if (!hasUnsavedChanges && pendingPage) onMenuChange(pendingPage);
  }, [hasUnsavedChanges, pendingPage, onMenuChange]);

  const confirmNavigation = (confirm: boolean) => {
    setShouldShowConfirmClose(false);

    if (confirm) setHasUnsavedChanges(false);
    else setPendingPage(undefined);
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
        currentPage: currentPage || defaultPage,
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
