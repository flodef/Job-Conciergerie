'use client';

import InstallToast from '@/app/components/installToast';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { PageManager } from '@/app/components/pageManager';
import { TimeAgoDisplay } from '@/app/components/timeAgoDisplay';
import { ToastMessage, ToastType } from '@/app/components/toastMessage';
import Tooltip from '@/app/components/tooltip';
import { useAuth, UserType } from '@/app/contexts/authProvider';
import { useBadge } from '@/app/contexts/badgeProvider';
import { useHomes } from '@/app/contexts/homesProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useFetchTime } from '@/app/hooks/useFetchTime';
import { cn } from '@/app/utils/className';
import { navigationPages, navigationRoutes, Page, routeMap } from '@/app/utils/navigation';
import {
  IconBriefcase,
  IconCalendar,
  IconClockHour3,
  IconHome,
  IconRefresh,
  IconSettings,
  IconUser,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';

// Map pages to their respective icons
export const pageSettings: Record<Page, { icon: ReactNode; userType: UserType | undefined }> = {
  [Page.Welcome]: { icon: null, userType: undefined },
  [Page.Waiting]: { icon: null, userType: undefined },
  [Page.Error]: { icon: null, userType: undefined },
  [Page.Missions]: { icon: <IconBriefcase size={30} />, userType: undefined },
  [Page.Calendar]: { icon: <IconCalendar size={30} />, userType: undefined },
  [Page.History]: { icon: <IconClockHour3 size={30} />, userType: 'employee' },
  [Page.Homes]: { icon: <IconHome size={30} />, userType: 'conciergerie' },
  [Page.Employees]: { icon: <IconUser size={30} />, userType: 'conciergerie' },
  [Page.Settings]: { icon: <IconSettings size={30} />, userType: undefined },
};

const MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

export default function NavigationLayout({ children }: { children: ReactNode }) {
  const { userType: authUserType, isLoading: isAuthLoading } = useAuth();

  // Add nice scrollbar styling
  React.useEffect(() => {
    const styleId = 'nice-scrollbar-style';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .nice-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .nice-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .nice-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(156, 163, 175, 0.5);
        border-radius: 3px;
      }
      .nice-scrollbar:hover::-webkit-scrollbar-thumb {
        background-color: rgba(156, 163, 175, 0.8);
      }
      .nice-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);
  const { isLoading: isLoadingMissions, fetchMissions } = useMissions();
  const { isLoading: isLoadingHomes, fetchHomes } = useHomes();
  const { currentPage, onMenuChange } = useMenuContext();

  const [userType, setUserType] = useState<UserType | undefined>(authUserType);
  const [isNavigationPage, setIsNavigationPage] = useState(false);
  const {
    pendingEmployeesCount,
    newMissionsCount,
    todayMissionsCount,
    startedMissionsCount,
    resetPendingEmployeesCount,
    resetNewMissionsCount,
  } = useBadge();
  const { lastFetchTime, updateFetchTime } = useFetchTime();
  const [refreshToast, setRefreshToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastManualRefresh, setLastManualRefresh] = useState<number>(0);

  // Handle manual refresh with rate limiting
  const handleManualRefresh = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastManualRefresh;

    if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
      const remainingSeconds = Math.ceil((MIN_REFRESH_INTERVAL - timeSinceLastRefresh) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      setRefreshToast({
        type: ToastType.Warning,
        message: `Veuillez attendre encore ${remainingMinutes} min avant de rafraîchir`,
      });
      setTimeout(() => setRefreshToast(null), 3000);
      return;
    }

    // Perform refresh
    setLastManualRefresh(now);

    // Refresh data based on current page
    if (currentPage === Page.Missions || currentPage === Page.Calendar) {
      fetchMissions().then(() => updateFetchTime(Page.Missions));
    }
    if (currentPage === Page.Homes) {
      fetchHomes().then(() => updateFetchTime(Page.Homes));
    }

    setRefreshToast({
      type: ToastType.Success,
      message: 'Données rafraîchies avec succès !',
    });
    setTimeout(() => setRefreshToast(null), 3000);
  }, [currentPage, fetchHomes, fetchMissions, lastManualRefresh, updateFetchTime]);

  // Intercept page refresh (F5, Ctrl+R, swipe down) and trigger app refresh instead
  useEffect(() => {
    let pullStartY = 0;
    let isPulling = false;

    // Handle F5 and Ctrl+R
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        handleManualRefresh();
      }
    };

    // Handle pull-to-refresh on mobile (only when scroll container is at top)
    const handleTouchStart = (e: TouchEvent) => {
      if (!isScrolled) {
        pullStartY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isScrolled) return;
      const pullY = e.touches[0].clientY;
      const pullDistance = pullY - pullStartY;

      // If pulled down more than 100px at top of page, trigger refresh
      if (pullDistance > 100) {
        isPulling = false;
        e.preventDefault();
        handleManualRefresh();
      }
    };

    const handleTouchEnd = () => {
      isPulling = false;
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleManualRefresh, isScrolled]);

  const isLoading = isAuthLoading || isLoadingMissions || isLoadingHomes;
  const loadingText = isLoadingMissions
    ? 'Chargement des missions...'
    : isLoadingHomes
      ? 'Chargement des biens...'
      : !isLoading
        ? 'Redirection...'
        : 'Identification...';

  useEffect(() => {
    // Check if current path is a navigation page and track scroll position
    const path = currentPage ? routeMap[currentPage] : window.location.pathname;
    const isNavigationPage = navigationRoutes.includes(path);
    setIsNavigationPage(isNavigationPage);
  }, [currentPage]);

  // Track scroll position for header blur effect from PageManager
  useEffect(() => {
    const handlePageScroll = (e: Event) => {
      const customEvent = e as CustomEvent<{ isScrolled: boolean }>;
      setIsScrolled(customEvent.detail.isScrolled);
    };

    window.addEventListener('pageScroll', handlePageScroll);
    return () => window.removeEventListener('pageScroll', handlePageScroll);
  }, []);

  const router = useRouter();

  // Sync local userType with auth context
  useEffect(() => {
    setUserType(authUserType);
  }, [authUserType]);

  // Redirect to welcome page if not authenticated
  useEffect(() => {
    // Only redirect after auth has finished loading and we're on a navigation page
    // Skip redirect when offline - let the app work with cached data
    if (!isAuthLoading && !authUserType && isNavigationPage && navigator.onLine) {
      router.push('/');
    }
  }, [isAuthLoading, authUserType, isNavigationPage, router]);

  // Listen for storage events to detect when user type changes from other tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setUserType(authUserType);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [authUserType]);

  // Handle menu item click with badge reset
  const handleMenuClick = (page: Page) => {
    // Reset the appropriate badge counter when clicking on that menu item
    if (page === Page.Employees) {
      resetPendingEmployeesCount();
    } else if (page === Page.Missions) {
      resetNewMissionsCount();
    }

    // Navigate to the page
    onMenuChange(page);
  };

  return (
    <div className="h-dvh flex flex-col">
      {/* Fixed header with blur on scroll */}
      {isNavigationPage && !!userType && (
        <header
          className={cn(
            'fixed top-0 left-0 right-0 mx-auto h-16 flex items-center justify-between px-4 w-full z-40 transition-all duration-200 bg-background',
            isScrolled ? 'shadow-md' : '',
          )}
        >
          {/* Title */}
          <h1 className="w-full text-2xl font-semibold text-foreground text-center">{currentPage}</h1>
          {/* Tooltip for last fetch time */}
          {!!lastFetchTime[currentPage] && (
            <Tooltip icon={IconRefresh} size="medium" orientation="horizontal" onClick={handleManualRefresh}>
              <div className="flex w-full justify-center text-center">
                Dernière mise à jour :<br /> il y a <TimeAgoDisplay lastFetchTime={lastFetchTime[currentPage]} />
              </div>
            </Tooltip>
          )}
          {/* Toast for refresh feedback */}
          {refreshToast && (
            <ToastMessage
              toast={{ type: refreshToast.type, message: refreshToast.message }}
              onClose={() => setRefreshToast(null)}
            />
          )}
        </header>
      )}

      {/* Installation toast - only shown for logged in users */}
      {isNavigationPage && !!userType && <InstallToast />}

      {/* Main content */}
      <main className={cn('flex-1 relative overflow-hidden', isNavigationPage && !!userType && 'pt-16')}>
        {/* Content wrapper - scrollable when content is long */}
        <div
          className={cn(
            'bg-background relative h-full overflow-y-auto flex flex-col nice-scrollbar',
            isNavigationPage && !!userType && 'pb-16',
          )}
        >
          {isLoading || (isNavigationPage && !userType) ? (
            <LoadingSpinner text={loadingText} />
          ) : isNavigationPage ? (
            <PageManager />
          ) : (
            children
          )}
        </div>
      </main>

      {/* Fixed bottom navigation bar - hidden on home page */}
      {isNavigationPage && !!userType && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-secondary z-40">
          <div className="mx-auto flex justify-around h-full border-t">
            {navigationPages
              .filter(page => {
                // Skip Welcome page in navigation
                if (page === Page.Welcome) return false;

                // Filter pages based on user type defined in pageSettings
                const pageConfig = pageSettings[page];
                return userType && (pageConfig.userType === userType || pageConfig.userType === undefined);
              })
              .map(page => (
                <button
                  key={page}
                  onClick={() => handleMenuClick(page)}
                  className={cn(
                    'flex flex-col items-center justify-center py-2 px-4',
                    'transition-colors duration-200 w-20 h-16 relative cursor-pointer',
                    page === currentPage ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-secondary/20',
                  )}
                >
                  <div className="mb-1 relative">
                    {pageSettings[page].icon}

                    {/* Badge for pending employees */}
                    {page === Page.Employees && pendingEmployeesCount > 0 && (
                      <div className="relative ml-auto z-10">
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {pendingEmployeesCount > 9 ? '9+' : pendingEmployeesCount}
                        </div>
                      </div>
                    )}

                    {/* Badge for new missions */}
                    {page === Page.Missions && newMissionsCount > 0 && (
                      <div className="relative ml-auto z-10">
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {newMissionsCount > 9 ? '9+' : newMissionsCount}
                        </div>
                      </div>
                    )}

                    {/* Badge for today's missions (employee) or started missions (conciergerie) */}
                    {page === Page.Calendar &&
                      (userType === 'employee' && todayMissionsCount > 0 ? (
                        <div className="relative ml-auto z-10">
                          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {todayMissionsCount > 9 ? '9+' : todayMissionsCount}
                          </div>
                        </div>
                      ) : userType === 'conciergerie' && startedMissionsCount > 0 ? (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {startedMissionsCount > 9 ? '9+' : startedMissionsCount}
                        </div>
                      ) : null)}
                  </div>
                  <span className="text-xs font-medium">{page}</span>
                </button>
              ))}
          </div>
        </nav>
      )}
    </div>
  );
}
