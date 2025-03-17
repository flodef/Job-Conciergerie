'use client';

import { checkUserExists } from '@/app/actions/auth';
import { Conciergerie, Employee } from '@/app/types/types';
import { generateSimpleId } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Define the type for the auth context
export type UserType = 'conciergerie' | 'employee' | undefined;

interface AuthContextType {
  userId: string;
  userType: UserType;
  setUserType: (userType: UserType) => void;
  selectedConciergerieName: string;
  setSelectedConciergerieName: (name: string) => void;
  conciergerieData: Conciergerie | undefined;
  employeeData: Employee | undefined;
  isLoading: boolean;
  error: string | undefined;
  refreshUserData: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  userId: '',
  userType: undefined,
  setUserType: () => {},
  selectedConciergerieName: '',
  setSelectedConciergerieName: () => {},
  conciergerieData: undefined,
  employeeData: undefined,
  isLoading: true,
  error: undefined,
  refreshUserData: async () => {},
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useLocalStorage<string>('user_id', '');
  const [userType, setUserType] = useLocalStorage<UserType>('user_type', undefined);
  const [selectedConciergerieName, setSelectedConciergerieName] = useLocalStorage<string>(
    'selected_conciergerie_name',
    '',
  );
  const [conciergerieData, setConciergerieData] = useState<Conciergerie>();
  const [employeeData, setEmployeeData] = useState<Employee>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>();

  // Function to check if a user exists in the database
  const checkUserInDatabase = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(undefined);

        // Only proceed if we have a valid ID
        if (!id) {
          setUserType(undefined);
          return;
        }

        // Use the server action to check if the user exists
        const { userType: foundUserType, userData } = await checkUserExists(id);

        // Update state based on what was found
        setUserType(foundUserType);

        if (foundUserType === 'employee') {
          setEmployeeData(userData as Employee);
          setConciergerieData(undefined);
          setSelectedConciergerieName('');
        } else if (foundUserType === 'conciergerie') {
          setEmployeeData(undefined);
          setConciergerieData(userData as Conciergerie);
          setSelectedConciergerieName((userData as Conciergerie).name);
        } else {
          setEmployeeData(undefined);
          setConciergerieData(undefined);
          setSelectedConciergerieName('');
        }
      } catch (err) {
        console.error('Error checking user in database:', err);
        setError('Error checking user in database');
      } finally {
        setIsLoading(false);
      }
    },
    [setUserType, setSelectedConciergerieName],
  );

  // Function to refresh user data
  const refreshUserData = async () => {
    if (!userId) return;
    await checkUserInDatabase(userId);
  };

  // Initialize the auth provider
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (!userId) {
          // Generate a new ID and store it in localStorage
          const id = generateSimpleId();
          setUserId(id);
        }

        // Check if the user exists in the database
        // This will set the userType based on where the ID is found
        await checkUserInDatabase(userId);
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('Error initializing auth');
        setIsLoading(false);
      }
    };

    // Only run this once when the component mounts
    initializeAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider
      value={{
        userId,
        userType,
        setUserType,
        selectedConciergerieName,
        setSelectedConciergerieName,
        conciergerieData,
        employeeData,
        isLoading,
        error,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
