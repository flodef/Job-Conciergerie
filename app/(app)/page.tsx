'use client';

import ConciergerieForm from '@/app/components/conciergerieForm';
import EmployeeForm from '@/app/components/employeeForm';
import InstallButton from '@/app/components/installButton';
import UserTypeSelection from '@/app/components/userTypeSelection';
import type { UserType } from '@/app/contexts/authProvider';
import { useAuth } from '@/app/contexts/authProvider';
import { useCallback, useEffect, useState } from 'react';
import {} from '@/app/utils/extensions';

export default function Home() {
  const { isLoading: authLoading, userType, updateUserType } = useAuth();
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showConciergerieForm, setShowConciergerieForm] = useState(false);

  const handleUserTypeSelect = useCallback(
    (type: UserType | undefined) => {
      // Save user type to localStorage
      updateUserType(type);

      // Show appropriate form based on user type
      setShowEmployeeForm(type === 'employee');
      setShowConciergerieForm(type === 'conciergerie');
    },
    [updateUserType, setShowEmployeeForm, setShowConciergerieForm],
  );

  // Initialize form state once after auth finishes loading. A ?type=employee|
  // conciergerie param (from the landing's signup CTAs) pre-selects the form.
  // Nothing to restore → don't touch the state: a click made while auth was
  // still loading must not be stomped by the effect firing afterwards.
  useEffect(() => {
    if (authLoading) return;
    const param = new URLSearchParams(window.location.search).get('type');
    const type = param === 'employee' || param === 'conciergerie' ? param : userType;
    if (type) handleUserTypeSelect(type);
  }, [authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCloseForm = () => {
    // Reset state to show selection screen
    updateUserType(undefined);
    setShowEmployeeForm(false);
    setShowConciergerieForm(false);
  };

  return (
    <div
      className={`min-h-full flex flex-col items-center bg-background ${showEmployeeForm ? 'justify-start' : 'justify-center'}`}
    >
      <div className="w-full max-w-md bg-background">
        {!userType && !showEmployeeForm && !showConciergerieForm ? (
          <div className="flex flex-col gap-6 cursor-pointer">
            <InstallButton />
            <UserTypeSelection onSelect={handleUserTypeSelect} />
          </div>
        ) : showEmployeeForm ? (
          <EmployeeForm onClose={handleCloseForm} />
        ) : showConciergerieForm ? (
          <ConciergerieForm onClose={handleCloseForm} />
        ) : null}
      </div>
    </div>
  );
}
