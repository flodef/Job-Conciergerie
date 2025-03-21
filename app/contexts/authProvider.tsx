'use client';

import { checkUserExists } from '@/app/actions/auth';
import { Conciergerie, Employee } from '@/app/types/types';
import { generateSimpleId } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { setCookie, deleteCookie } from '@/app/utils/cookies';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Define the type for the auth context
export type UserType = 'conciergerie' | 'employee' | undefined;

interface AuthContextType {
  userId: string | undefined;
  userType: UserType;
  updateUserType: (userType: UserType) => void;
  selectedConciergerieName: string | undefined;
  setSelectedConciergerieName: (name: string | undefined) => void;
  conciergerieData: Conciergerie | undefined;
  employeeData: Employee | undefined;
  isLoading: boolean;
  error: string | undefined;
  refreshUserData: () => Promise<void>;
  disconnect: () => void;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  userId: undefined,
  userType: undefined,
  updateUserType: () => {},
  selectedConciergerieName: undefined,
  setSelectedConciergerieName: () => {},
  conciergerieData: undefined,
  employeeData: undefined,
  isLoading: false,
  error: undefined,
  refreshUserData: async () => {},
  disconnect: () => {},
});

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useLocalStorage<string>('user_id');
  const [userType, setUserType] = useLocalStorage<UserType>('user_type');
  const [selectedConciergerieName, setSelectedConciergerieName] = useLocalStorage<string>('selected_conciergerie_name');
  const [conciergerieData, setConciergerieData] = useState<Conciergerie>();
  const [employeeData, setEmployeeData] = useState<Employee>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>();

  const updateUserId = useCallback(
    (userId: string | undefined) => {
      setUserId(userId);
      if (userId) {
        setCookie('user_id', userId);
      } else {
        deleteCookie('user_id');
      }
    },
    [setUserId],
  );

  const updateUserType = useCallback(
    (userType: UserType) => {
      setUserType(userType);
      if (userType) {
        setCookie('user_type', userType);
      } else {
        deleteCookie('user_type');
      }
    },
    [setUserType],
  );

  // Function to check if a user exists in the database
  const checkUserInDatabase = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(undefined);

        // Only proceed if we have a valid ID
        if (!id) {
          updateUserType(undefined);
          return;
        }

        // Use the server action to check if the user exists
        const { userType: foundUserType, userData } = await checkUserExists(id);

        // Update state only if we have a valid user type, otherwise it means the user is still registering
        if (foundUserType) updateUserType(foundUserType);

        setEmployeeData(foundUserType === 'employee' ? (userData as Employee) : undefined);
        setConciergerieData(foundUserType === 'conciergerie' ? (userData as Conciergerie) : undefined);
      } catch (err) {
        console.error('Error checking user in database:', err);
        setError('Error checking user in database');
      } finally {
        setIsLoading(false);
      }
    },
    [updateUserType],
  );

  // Function to refresh user data
  const refreshUserData = async () => {
    await checkUserInDatabase(userId!);
  };

  // Initialize the auth provider
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const id = userId ?? generateSimpleId();
        updateUserId(id);

        // Check if the user exists in the database
        // This will set the userType based on where the ID is found
        await checkUserInDatabase(id);
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('Error initializing auth');
        setIsLoading(false);
      }
    };

    // Only run this once when the component mounts
    initializeAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = () => {
    // Clear only the user type from localStorage (keep other data)
    updateUserId(undefined);
    updateUserType(undefined);
    setSelectedConciergerieName(undefined);

    // Force a full page reload to reset the app state
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        userType,
        updateUserType,
        selectedConciergerieName,
        setSelectedConciergerieName,
        conciergerieData,
        employeeData,
        isLoading,
        error,
        refreshUserData,
        disconnect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
