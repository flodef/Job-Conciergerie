'use client';

import Calendar from '@/app/calendar/page';
import EmployeesList from '@/app/employees/page';
import HomesPage from '@/app/homes/page';
import MissionsPage from '@/app/missions/page';
import Settings from '@/app/settings/page';
import { Page } from '@/app/utils/navigation';
import { useMenuContext } from '@/app/contexts/menuProvider';

// All pages are rendered once and kept in DOM, only visibility changes
export function PageManager() {
  const { currentPage } = useMenuContext();

  // Use Missions as default if currentPage is not set
  const activePage = currentPage || Page.Missions;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: activePage === Page.Missions ? 1 : 0,
          visibility: activePage === Page.Missions ? 'visible' : 'hidden',
          transition: 'opacity 200ms ease-in-out',
          pointerEvents: activePage === Page.Missions ? 'auto' : 'none',
        }}
      >
        <MissionsPage />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: activePage === Page.Calendar ? 1 : 0,
          visibility: activePage === Page.Calendar ? 'visible' : 'hidden',
          transition: 'opacity 200ms ease-in-out',
          pointerEvents: activePage === Page.Calendar ? 'auto' : 'none',
        }}
      >
        <Calendar />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: activePage === Page.Homes ? 1 : 0,
          visibility: activePage === Page.Homes ? 'visible' : 'hidden',
          transition: 'opacity 200ms ease-in-out',
          pointerEvents: activePage === Page.Homes ? 'auto' : 'none',
        }}
      >
        <HomesPage />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: activePage === Page.Employees ? 1 : 0,
          visibility: activePage === Page.Employees ? 'visible' : 'hidden',
          transition: 'opacity 200ms ease-in-out',
          pointerEvents: activePage === Page.Employees ? 'auto' : 'none',
        }}
      >
        <EmployeesList />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: activePage === Page.Settings ? 1 : 0,
          visibility: activePage === Page.Settings ? 'visible' : 'hidden',
          transition: 'opacity 200ms ease-in-out',
          pointerEvents: activePage === Page.Settings ? 'auto' : 'none',
        }}
      >
        <Settings />
      </div>
    </>
  );
}
