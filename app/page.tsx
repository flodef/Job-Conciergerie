'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ConciergerieForm from './components/conciergerieForm';
import EmployeeForm from './components/employeeForm';
import LoadingSpinner from './components/loadingSpinner';
import UserTypeSelection from './components/userTypeSelection';
import conciergeriesData from './data/conciergeries.json';
import { getWelcomeParams, hasCompletedWelcomeFlow } from './utils/welcomeParams';

// Get conciergerie names from the JSON data
const conciergerieNames = conciergeriesData.map(conciergerie => conciergerie.name);

export default function Home() {
  const router = useRouter();
  const [userType, setUserType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showConciergerieForm, setShowConciergerieForm] = useState(false);

  // Initialize state from localStorage
  useEffect(() => {
    const initializeFromLocalStorage = async () => {
      setIsLoading(true);

      // Add a small delay to ensure localStorage is properly loaded
      await new Promise(resolve => setTimeout(resolve, 800));

      // Check if user has completed the welcome flow
      if (hasCompletedWelcomeFlow()) {
        window.location.href = '/missions';
        return;
      }

      // Get user type from localStorage
      const { userType: storedUserType } = getWelcomeParams();
      setUserType(storedUserType);

      // Show appropriate form based on user type
      if (storedUserType === 'employee') {
        setShowEmployeeForm(true);
        setShowConciergerieForm(false);
      } else if (storedUserType === 'conciergerie') {
        setShowConciergerieForm(true);
        setShowEmployeeForm(false);
      }

      setIsLoading(false);
    };

    initializeFromLocalStorage();
  }, [router]);

  const handleUserTypeSelect = (type: string) => {
    // Save user type to localStorage
    localStorage.setItem('user_type', JSON.stringify(type));
    setUserType(type);

    // Show appropriate form based on user type
    if (type === 'employee') {
      setShowEmployeeForm(true);
    } else if (type === 'conciergerie') {
      setShowConciergerieForm(true);
    }
  };

  const handleCloseForm = () => {
    // Clear user type from localStorage
    localStorage.removeItem('user_type');

    // Reset state to show selection screen
    setUserType(null);
    setShowEmployeeForm(false);
    setShowConciergerieForm(false);
  };

  // Show loading spinner while checking localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-background overflow-hidden">
        {!userType && !showEmployeeForm && !showConciergerieForm ? (
          <UserTypeSelection onSelect={handleUserTypeSelect} />
        ) : showEmployeeForm ? (
          <EmployeeForm conciergerieNames={conciergerieNames} onClose={handleCloseForm} />
        ) : showConciergerieForm ? (
          <ConciergerieForm companies={conciergerieNames} onClose={handleCloseForm} />
        ) : null}
      </div>
    </main>
  );
}
