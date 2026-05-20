'use client';

import Calendar from '@/app/calendar/page';
import EmployeesList from '@/app/employees/page';
import HomesPage from '@/app/homes/page';
import MissionsPage from '@/app/missions/page';
import Settings from '@/app/settings/page';
import Welcome from '@/app/waiting/page';
import { Page } from '@/app/utils/navigation';
import { useMenuContext } from '@/app/contexts/menuProvider';

// All pages are rendered once and kept in DOM, only visibility changes
export function PageManager() {
  const { currentPage } = useMenuContext();

  // Use Welcome as default if currentPage is not set (unauthenticated)
  const activePage = currentPage || Page.Welcome;

  return (
    <div className="h-full overflow-y-auto relative">
      {/* Each page wrapper - active page is relative (natural height), inactive are absolute with 0 height */}
      <div
        className="transition-opacity duration-200 ease-in-out"
        style={{
          position: activePage === Page.Missions ? 'relative' : 'absolute',
          height: activePage === Page.Missions ? 'auto' : 0,
          overflow: activePage === Page.Missions ? 'visible' : 'hidden',
          opacity: activePage === Page.Missions ? 1 : 0,
          width: '100%',
        }}
      >
        <MissionsPage />
      </div>
      <div
        className="transition-opacity duration-200 ease-in-out"
        style={{
          position: activePage === Page.Calendar ? 'relative' : 'absolute',
          height: activePage === Page.Calendar ? 'auto' : 0,
          overflow: activePage === Page.Calendar ? 'visible' : 'hidden',
          opacity: activePage === Page.Calendar ? 1 : 0,
          width: '100%',
        }}
      >
        <Calendar />
      </div>
      <div
        className="transition-opacity duration-200 ease-in-out"
        style={{
          position: activePage === Page.Homes ? 'relative' : 'absolute',
          height: activePage === Page.Homes ? 'auto' : 0,
          overflow: activePage === Page.Homes ? 'visible' : 'hidden',
          opacity: activePage === Page.Homes ? 1 : 0,
          width: '100%',
        }}
      >
        <HomesPage />
      </div>
      <div
        className="transition-opacity duration-200 ease-in-out"
        style={{
          position: activePage === Page.Employees ? 'relative' : 'absolute',
          height: activePage === Page.Employees ? 'auto' : 0,
          overflow: activePage === Page.Employees ? 'visible' : 'hidden',
          opacity: activePage === Page.Employees ? 1 : 0,
          width: '100%',
        }}
      >
        <EmployeesList />
      </div>
      <div
        className="transition-opacity duration-200 ease-in-out"
        style={{
          position: activePage === Page.Settings ? 'relative' : 'absolute',
          height: activePage === Page.Settings ? 'auto' : 0,
          overflow: activePage === Page.Settings ? 'visible' : 'hidden',
          opacity: activePage === Page.Settings ? 1 : 0,
          width: '100%',
        }}
      >
        <Settings />
      </div>
      <div
        className="transition-opacity duration-200 ease-in-out"
        style={{
          position: activePage === Page.Welcome ? 'relative' : 'absolute',
          height: activePage === Page.Welcome ? 'auto' : 0,
          overflow: activePage === Page.Welcome ? 'visible' : 'hidden',
          opacity: activePage === Page.Welcome ? 1 : 0,
          width: '100%',
        }}
      >
        <Welcome />
      </div>
    </div>
  );
}
