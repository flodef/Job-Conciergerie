'use client';

import { useAuth, UserType } from '@/app/contexts/authProvider';
import { useBadge } from '@/app/contexts/badgeProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { navigationRoutes, Page, pages, routeMap } from '@/app/utils/navigation';
import { IconBriefcase, IconCalendar, IconHome, IconSettings, IconUser } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import { ReactNode, useEffect, useState } from 'react';
import { useHomes } from '../contexts/homesProvider';
import { useMissions } from '../contexts/missionsProvider';

// Map pages to their respective icons
const pageSettings: Record<Page, { icon: ReactNode; userType: UserType | undefined }> = {
  [Page.Welcome]: { icon: null, userType: undefined },
  [Page.Waiting]: { icon: null, userType: undefined },
  [Page.Error]: { icon: null, userType: undefined },
  [Page.Missions]: { icon: <IconBriefcase size={30} />, userType: undefined },
  [Page.Calendar]: { icon: <IconCalendar size={30} />, userType: undefined },
  [Page.Homes]: { icon: <IconHome size={30} />, userType: 'conciergerie' },
  [Page.Employees]: { icon: <IconUser size={30} />, userType: 'conciergerie' },
  [Page.Settings]: { icon: <IconSettings size={30} />, userType: undefined },
};

export default function NavigationLayout({ children }: { children: ReactNode }) {
  const { userType: authUserType, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isLoadingMissions } = useMissions();
  const { isLoading: isLoadingHomes } = useHomes();
  const { currentPage, onMenuChange } = useMenuContext();

  const [userType, setUserType] = useState<UserType>();
  const [isNavigationPage, setIsNavigationPage] = useState(false);
  const {
    pendingEmployeesCount,
    newMissionsCount,
    todayMissionsCount,
    startedMissionsCount,
    resetPendingEmployeesCount,
    resetNewMissionsCount,
  } = useBadge();

  const isLoading = isAuthLoading || isLoadingMissions || isLoadingHomes;

  useEffect(() => {
    // Check if we're on the homepage or waiting page
    const path = currentPage ? routeMap[currentPage] : window.location.pathname;
    const isNavigationPage = navigationRoutes.includes(path);
    setIsNavigationPage(isNavigationPage);
  }, [currentPage]);

  // Hack to handle user type change : listen for storage events to detect when user type changes
  useEffect(() => {
    const handleStorageChange = () => {
      setUserType(authUserType);
    };

    handleStorageChange();

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="min-h-screen flex flex-col">
      {/* Fixed header - hidden on home page */}
      {isNavigationPage && (
        <header className="max-w-7xl mx-auto h-16 flex items-center justify-center">
          {/* Title */}
          <h1 className="text-2xl font-semibold text-foreground">{currentPage}</h1>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 relative">
        {/* Content wrapper with padding to prevent content from being hidden under the navigation */}
        <div
          className={clsx(
            'bg-background px-4',
            isNavigationPage
              ? !isLoading
                ? 'min-h-[calc(100dvh-4rem)] pb-20'
                : 'h-[calc(100dvh-4rem)] pb-20'
              : 'h-screen',
          )}
        >
          {children}
        </div>
      </main>

      {/* Fixed bottom navigation bar - hidden on home page */}
      {isNavigationPage && (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-background border-t border-secondary z-40">
          <div className="max-w-7xl mx-auto flex justify-around h-full">
            {pages
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
                  className={clsx(
                    'flex flex-col items-center justify-center py-2 px-4',
                    'transition-colors duration-200 w-20 h-20 relative',
                    page === currentPage ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-secondary/20',
                  )}
                >
                  <div className="mb-1 relative">
                    {pageSettings[page].icon}

                    {/* Badge for pending employees */}
                    {page === Page.Employees && pendingEmployeesCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingEmployeesCount > 9 ? '9+' : pendingEmployeesCount}
                      </div>
                    )}

                    {/* Badge for new missions */}
                    {page === Page.Missions && newMissionsCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {newMissionsCount > 9 ? '9+' : newMissionsCount}
                      </div>
                    )}

                    {/* Badge for today's missions (employee) or started missions (conciergerie) */}
                    {page === Page.Calendar &&
                      (userType === 'employee' && todayMissionsCount > 0 ? (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {todayMissionsCount > 9 ? '9+' : todayMissionsCount}
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
