'use client';

import { fetchConciergeries } from '@/app/actions/conciergerie';
import ConciergerieForm from '@/app/components/conciergerieForm';
import EmployeeForm from '@/app/components/employeeForm';
import LoadingSpinner from '@/app/components/loadingSpinner';
import UserTypeSelection from '@/app/components/userTypeSelection';
import { useAuth, UserType } from '@/app/contexts/authProvider';
import { Conciergerie } from '@/app/types/types';
import { useRedirectIfRegistered } from '@/app/utils/authRedirect';
import { useEffect, useState } from 'react';

export default function Home() {
  const { isLoading: authLoading, userType, setUserType } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showConciergerieForm, setShowConciergerieForm] = useState(false);
  const [conciergerieNames, setConciergerieNames] = useState<string[]>([]);

  // Fetch conciergerie names from the database
  useEffect(() => {
    const loadConciergerieNames = async () => {
      try {
        const conciergeries = await fetchConciergeries();
        const names = conciergeries
          .sort((a: Conciergerie, b: Conciergerie) => a.name.localeCompare(b.name))
          .map((conciergerie: Conciergerie) => conciergerie.name);
        setConciergerieNames(names);
      } catch (error) {
        console.error('Error fetching conciergerie names:', error);
      }
    };

    loadConciergerieNames();
  }, []);

  // Use the redirect hook to redirect if already registered
  useRedirectIfRegistered();

  // Initialize state from auth context
  useEffect(() => {
    const initializeFromAuth = async () => {
      setIsLoading(true);

      // Add a small delay for smoother loading experience
      await new Promise(resolve => setTimeout(resolve, 800));

      // Show appropriate form based on user type
      if (userType === 'employee') {
        setShowEmployeeForm(true);
        setShowConciergerieForm(false);
      } else if (userType === 'conciergerie') {
        setShowConciergerieForm(true);
        setShowEmployeeForm(false);
      }

      setIsLoading(false);
    };

    if (!authLoading) {
      initializeFromAuth();
    }
  }, [authLoading, userType]);

  const handleUserTypeSelect = (type: UserType) => {
    // Save user type to localStorage
    setUserType(type);

    // Show appropriate form based on user type
    if (type === 'employee') {
      setShowEmployeeForm(true);
    } else if (type === 'conciergerie') {
      setShowConciergerieForm(true);
    }
  };

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
          <EmployeeForm conciergerieNames={conciergerieNames} onClose={handleCloseForm} />
        ) : showConciergerieForm ? (
          <ConciergerieForm conciergerieNames={conciergerieNames} onClose={handleCloseForm} />
        ) : null}
      </div>
    </main>
  );
}
