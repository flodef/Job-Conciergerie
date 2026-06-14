'use client';

import Calendar from '@/app/calendar/page';
import EmployeesList from '@/app/employees/page';
import HistoryPage from '@/app/history/page';
import HomesPage from '@/app/homes/page';
import MissionsPage from '@/app/missions/page';
import Settings from '@/app/settings/page';
import Welcome from '@/app/waiting/page';
import { Page } from '@/app/utils/navigation';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { useEffect, useRef } from 'react';

const pages = [
  { page: Page.Missions, component: <MissionsPage /> },
  { page: Page.Calendar, component: <Calendar /> },
  { page: Page.History, component: <HistoryPage /> },
  { page: Page.Homes, component: <HomesPage /> },
  { page: Page.Employees, component: <EmployeesList /> },
  { page: Page.Settings, component: <Settings /> },
  { page: Page.Welcome, component: <Welcome /> },
] as const;

// All pages are rendered once and kept in DOM, only visibility changes
export function PageManager() {
  const { currentPage } = useMenuContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Use Welcome as default if currentPage is not set (unauthenticated)
  const activePage = currentPage || Page.Welcome;

  // Emit scroll events for header shadow effect
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isScrolled = container.scrollTop > 10;
      window.dispatchEvent(new CustomEvent('pageScroll', { detail: { isScrolled } }));
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto relative">
      {pages.map(({ page, component }) => (
        <div
          key={page}
          className="transition-opacity duration-200 ease-in-out"
          style={{
            position: activePage === page ? 'relative' : 'absolute',
            height: activePage === page ? 'auto' : 0,
            overflow: activePage === page ? 'visible' : 'hidden',
            opacity: activePage === page ? 1 : 0,
            width: '100%',
          }}
        >
          {component}
        </div>
      ))}
    </div>
  );
}
