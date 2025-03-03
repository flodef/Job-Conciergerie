'use client';

import { useRedirectIfNotRegistered } from '../utils/redirectIfNotRegistered';
import EmployeesList from '../components/employeesList';

export default function Employees() {
  // Redirect if not registered
  useRedirectIfNotRegistered();

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background w-full">
      <EmployeesList />
    </div>
  );
}
