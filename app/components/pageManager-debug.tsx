'use client';

import Calendar from '@/app/calendar/page';
import EmployeesList from '@/app/employees/page';
import HomesPage from '@/app/homes/page';
import MissionsPage from '@/app/missions/page';
import Settings from '@/app/settings/page';

// DEBUG VERSION - Shows all pages stacked vertically
export function PageManager() {
  return (
    <div className="w-full min-h-full bg-background overflow-y-auto">
      {/* Missions Page */}
      <div className="border-4 border-red-500 my-4">
        <div className="bg-red-100 text-red-800 p-2 font-bold">MISSIONS PAGE</div>
        <MissionsPage />
      </div>

      {/* Calendar Page */}
      <div className="border-4 border-blue-500 my-4">
        <div className="bg-blue-100 text-blue-800 p-2 font-bold">CALENDAR PAGE</div>
        <Calendar />
      </div>

      {/* Homes Page */}
      <div className="border-4 border-green-500 my-4">
        <div className="bg-green-100 text-green-800 p-2 font-bold">HOMES PAGE</div>
        <HomesPage />
      </div>

      {/* Employees Page */}
      <div className="border-4 border-yellow-500 my-4">
        <div className="bg-yellow-100 text-yellow-800 p-2 font-bold">EMPLOYEES PAGE</div>
        <EmployeesList />
      </div>

      {/* Settings Page */}
      <div className="border-4 border-purple-500 my-4">
        <div className="bg-purple-100 text-purple-800 p-2 font-bold">SETTINGS PAGE</div>
        <Settings />
      </div>
    </div>
  );
}
