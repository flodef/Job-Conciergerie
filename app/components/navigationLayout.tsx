'use client';

import { Page, pages, useMenuContext } from '@/app/contexts/menuProvider';
import { getWelcomeParams } from '@/app/utils/welcomeParams';
import { IconBriefcase, IconHome, IconSettings, IconUser } from '@tabler/icons-react';
import clsx from 'clsx/lite';
import { ReactNode, useEffect, useState } from 'react';
import { useBadge } from '../contexts/badgeProvider';

// Map pages to their respective icons
const pageIcons: Record<Page, ReactNode> = {
  [Page.Welcome]: null,
  [Page.Missions]: <IconBriefcase size={30} />,
  [Page.Homes]: <IconHome size={30} />,
  [Page.Employees]: <IconUser size={30} />,
  [Page.Settings]: <IconSettings size={30} />,
};

export default function NavigationLayout({ children }: { children: ReactNode }) {
  const { currentPage, onMenuChange } = useMenuContext();
  const [isHomePage, setIsHomePage] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const { pendingEmployeesCount, newMissionsCount, resetPendingEmployeesCount, resetNewMissionsCount } = useBadge();

  useEffect(() => {
    // Check if we're on the homepage or waiting page
    const path = window.location.pathname;
    setIsHomePage(path === '/' || path === '/waiting');
  }, []);

  useEffect(() => {
    // Get user type from localStorage
    const { userType } = getWelcomeParams();
    setUserType(userType);

    // Listen for storage events to detect when user data changes
    const handleStorageChange = () => {
      const { userType: newUserType } = getWelcomeParams();
      setUserType(newUserType);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

  // Don't show navigation if user is not logged in
  if (!userType) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed header - hidden on home page */}
      {!isHomePage && (
        <header className="max-w-7xl mx-auto h-16 flex items-center justify-center">
          {/* Title */}
          <h1 className="text-2xl font-semibold text-foreground">{currentPage}</h1>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 relative">
        {/* Content wrapper with padding to prevent content from being hidden under the navigation */}
        <div
          className={clsx('bg-background px-4', !isHomePage ? 'min-h-[calc(100dvh-9rem)] pb-24' : 'min-h-screen py-4')}
        >
          {children}
        </div>
      </main>

      {/* Fixed bottom navigation bar - hidden on home page */}
      {!isHomePage && (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-background border-t border-secondary z-40">
          <div className="max-w-7xl mx-auto flex justify-around h-full">
            {pages
              .filter(page => {
                // Filter pages based on user type
                if (userType === 'employee') {
                  // Employees can only see Missions and Settings
                  return page === Page.Missions || page === Page.Settings;
                }
                // Skip Welcome page in navigation
                return page !== Page.Welcome;
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
                    {pageIcons[page]}

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
