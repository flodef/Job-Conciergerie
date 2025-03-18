'use client';

import { fetchConciergeries } from '@/app/actions/conciergerie';
import ConciergerieForm from '@/app/components/conciergerieForm';
import EmployeeForm from '@/app/components/employeeForm';
import LoadingSpinner from '@/app/components/loadingSpinner';
import UserTypeSelection from '@/app/components/userTypeSelection';
import { useAuth, UserType } from '@/app/contexts/authProvider';
import { Conciergerie } from '@/app/types/types';
import { useRedirectIfRegistered } from '@/app/utils/authRedirect';
import { useCallback, useEffect, useState } from 'react';

export default function Home() {
  const { isLoading: authLoading, userType, setUserType } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
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

  // Use the redirect hook to redirect if already registered
  // Only redirect if we have a valid user type and they're already registered
  useRedirectIfRegistered();

  const handleUserTypeSelect = useCallback(
    (type: UserType) => {
      // Save user type to localStorage
      setUserType(type);

      // Show appropriate form based on user type
      setShowEmployeeForm(type === 'employee');
      setShowConciergerieForm(type === 'conciergerie');
    },
    [setUserType, setShowEmployeeForm, setShowConciergerieForm],
  );

  // Initialize state from auth context
  useEffect(() => {
    if (!authLoading) return;

    // Show appropriate form based on user type
    // If the user is not found in the database, they should still see the form
    handleUserTypeSelect(userType);
  }, [authLoading, userType, handleUserTypeSelect]);

  const handleCloseForm = () => {
    // Reset state to show selection screen
    setUserType(undefined);
    setShowEmployeeForm(false);
    setShowConciergerieForm(false);
  };

  // Show loading spinner while checking auth state
  if (isLoading || authLoading) {
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
