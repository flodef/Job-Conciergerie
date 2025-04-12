'use client';

import ConciergerieForm from '@/app/components/conciergerieForm';
import EmployeeForm from '@/app/components/employeeForm';
import InstallButton from '@/app/components/installButton';
import UserTypeSelection from '@/app/components/userTypeSelection';
import { useAuth, UserType } from '@/app/contexts/authProvider';
import { useCallback, useEffect, useState } from 'react';

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

  // Initialize state from auth context
  useEffect(() => {
    // Only initialize forms after auth is loaded and we've checked registration
    if (authLoading) return;

    // Show appropriate form based on user type
    // If the user is not found in the database, they should still see the form
    handleUserTypeSelect(userType);
  }, [authLoading, userType, handleUserTypeSelect]);

  const handleCloseForm = () => {
    // Reset state to show selection screen
    updateUserType(undefined);
    setShowEmployeeForm(false);
    setShowConciergerieForm(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background pt-2">
      <div className="w-full max-w-md bg-background overflow-hidden">
        {!userType && !showEmployeeForm && !showConciergerieForm ? (
          <div className="flex gap-6">
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
