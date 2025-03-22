'use client';

import { fetchConciergeries } from '@/app/actions/conciergerie';
import { fetchEmployees } from '@/app/actions/employee';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { Conciergerie, Employee } from '@/app/types/types';
import { deleteCookie, setCookie } from '@/app/utils/cookies';
import { generateSimpleId } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { navigationRoutes, Page } from '@/app/utils/navigation';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Define the type for the auth context
export type UserType = 'conciergerie' | 'employee' | undefined;
export type UserData = Conciergerie | Employee | undefined;

interface AuthContextType {
  userId: string | undefined;
  userType: UserType;
  updateUserType: (userType: UserType) => void;
  conciergerieName: string | undefined;
  setConciergerieName: (name: string | undefined) => void;
  sentEmailError: boolean | undefined;
  setSentEmailError: (sentEmailError: boolean | undefined) => void;
  userData: UserData;
  conciergeries: Conciergerie[] | undefined;
  employees: Employee[] | undefined;
  isLoading: boolean;
  refreshData: (redirectPage?: Page) => Promise<void>;
  disconnect: () => void;
  nuke: () => void;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  userId: undefined,
  userType: undefined,
  updateUserType: () => {},
  conciergerieName: undefined,
  setConciergerieName: () => {},
  sentEmailError: undefined,
  setSentEmailError: () => {},
  userData: undefined,
  conciergeries: undefined,
  employees: undefined,
  isLoading: false,
  refreshData: async () => {},
  disconnect: () => {},
  nuke: () => {},
});

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { onMenuChange } = useMenuContext();

  const router = useRouter();

  const [userId, setUserId] = useLocalStorage<string>('user_id');
  const [userType, setUserType] = useLocalStorage<UserType>('user_type');
  const [conciergerieName, setConciergerieName] = useLocalStorage<string>('conciergerie_name');
  const [sentEmailError, setSentEmailError] = useLocalStorage<boolean>('sent_email_error');

  const [userData, setUserData] = useState<UserData>();
  const [conciergeries, setConciergeries] = useState<Conciergerie[]>();
  const [employees, setEmployees] = useState<Employee[]>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
  const getDataFromDatabase = useCallback(
    async (id: string, redirectPage?: Page) => {
      try {
        setIsLoading(true);

        // Only proceed if we have a valid ID
        if (!id) {
          updateUserType(undefined);
          return;
        }

        const fetchedConciergeries = await fetchConciergeries();
        const fetchedEmployees = await fetchEmployees();

        const foundEmployee = fetchedEmployees.find(e => e.id === id);
        const newUserData = foundEmployee || fetchedConciergeries.find(c => c.id === id);
        const isEmployee = !!newUserData && !!foundEmployee;
        const isConciergerie = (!!newUserData && !isEmployee) || userType === 'conciergerie';
        const newUserType = isEmployee ? 'employee' : isConciergerie ? 'conciergerie' : undefined;

        console.warn('Loading data from database');

        setConciergeries(fetchedConciergeries);
        setEmployees(fetchedEmployees);
        updateUserType(newUserType);
        setUserData(newUserData);

        // Special case where the userId cookie has been manually deleted
        if (newUserData && !navigationRoutes.includes(window.location.pathname)) {
          router.refresh();
        }
        if (redirectPage) onMenuChange(redirectPage);
      } catch (err) {
        console.error('Error fetching user data from database:', err);
        onMenuChange(Page.Error);
      } finally {
        setIsLoading(false);
      }
    },
    [updateUserType, router, userType, onMenuChange],
  );

  // Function to refresh user data
  const refreshData = async (redirectPage?: Page) => {
    await getDataFromDatabase(userId!, redirectPage);
  };

  // Initialize the auth provider
  useEffect(() => {
    const initializeData = async () => {
      await getDataFromDatabase(id);
    };

    const id = userId ?? generateSimpleId();
    updateUserId(id);

    // Only run this once when the component mounts
    initializeData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = () => {
    // Clear all data from localStorage
    updateUserId(undefined);
    updateUserType(undefined);
    setConciergerieName(undefined);
    setSentEmailError(undefined);

    // Force a full page reload to reset the app state
    router.push('/');
  };

  const nuke = () => {
    // Clear all data from localStorage
    localStorage.clear();

    // Force a full page reload to reset the app state
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        userType,
        updateUserType,
        conciergerieName,
        setConciergerieName,
        sentEmailError,
        setSentEmailError,
        userData,
        conciergeries,
        employees,
        isLoading,
        refreshData,
        disconnect,
        nuke,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
