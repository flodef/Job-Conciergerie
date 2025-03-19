'use client';

import { fetchConciergeries } from '@/app/actions/conciergerie';
import ConciergerieForm from '@/app/components/conciergerieForm';
import EmployeeForm from '@/app/components/employeeForm';
import LoadingSpinner from '@/app/components/loadingSpinner';
import UserTypeSelection from '@/app/components/userTypeSelection';
import { useAuth, UserType } from '@/app/contexts/authProvider';
import { Conciergerie } from '@/app/types/types';
import { useCallback, useEffect, useState } from 'react';

export default function Home() {
  const { isLoading: authLoading, userType, updateUserType } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showConciergerieForm, setShowConciergerieForm] = useState(false);
  const [conciergeries, setConciergeries] = useState<Conciergerie[]>([]);

  // Fetch conciergerie names from the database
  useEffect(() => {
    const loadConciergeries = async () => {
      try {
        setIsLoading(true);
        const conciergeries = await fetchConciergeries();
        setConciergeries(conciergeries);
      } catch (error) {
        console.error('Error fetching conciergerie names:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConciergeries();
  }, []);

  // Simplified check to know when to show forms
  useEffect(() => {
    if (!authLoading) {
      setIsCheckingRegistration(false);
    }
  }, [authLoading]);

  const handleUserTypeSelect = useCallback(
    (type: UserType) => {
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
    if (authLoading || isCheckingRegistration) return;

    // Show appropriate form based on user type
    // If the user is not found in the database, they should still see the form
    handleUserTypeSelect(userType);
  }, [authLoading, userType, handleUserTypeSelect, isCheckingRegistration]);

  const handleCloseForm = () => {
    // Reset state to show selection screen
    updateUserType(undefined);
    setShowEmployeeForm(false);
    setShowConciergerieForm(false);
  };

  // Show loading spinner while checking auth state or registration status
  if (isLoading || authLoading || isCheckingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-2">
      <div className="w-full max-w-md bg-background overflow-hidden">
        {!userType && !showEmployeeForm && !showConciergerieForm ? (
          <UserTypeSelection onSelect={handleUserTypeSelect} />
        ) : showEmployeeForm ? (
          <EmployeeForm conciergeries={conciergeries} onClose={handleCloseForm} />
        ) : showConciergerieForm ? (
          <ConciergerieForm conciergeries={conciergeries} onClose={handleCloseForm} />
        ) : null}
      </div>
    </main>
  );
}
