'use client';

import Calendar from '@/app/calendar/page';
import EmployeesList from '@/app/employees/page';
import HomesPage from '@/app/homes/page';
import MissionsPage from '@/app/missions/page';
import Settings from '@/app/settings/page';
import { Page } from '@/app/utils/navigation';
import { useMenuContext } from '@/app/contexts/menuProvider';
import clsx from 'clsx/lite';

// All pages are rendered once and kept in DOM, only visibility changes
export function PageManager() {
  const { currentPage } = useMenuContext();

  // Use Missions as default if currentPage is not set
  const activePage = currentPage || Page.Missions;

  return (
    <>
      <div style={{ display: activePage === Page.Missions ? 'block' : 'none' }}>
        <MissionsPage />
      </div>
      <div style={{ display: activePage === Page.Calendar ? 'block' : 'none' }}>
        <Calendar />
      </div>
      <div style={{ display: activePage === Page.Homes ? 'block' : 'none' }}>
        <HomesPage />
      </div>
      <div style={{ display: activePage === Page.Employees ? 'block' : 'none' }}>
        <EmployeesList />
      </div>
      <div style={{ display: activePage === Page.Settings ? 'block' : 'none' }}>
        <Settings />
      </div>
    </>
  );
}
