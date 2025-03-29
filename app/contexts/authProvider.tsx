'use client';

import { fetchConciergeries } from '@/app/actions/conciergerie';
import { fetchEmployees } from '@/app/actions/employee';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { Conciergerie, Employee } from '@/app/types/dataTypes';
import { setPrimaryColor } from '@/app/utils/color';
import { deleteCookie, setCookie } from '@/app/utils/cookies';
import { generateSimpleId } from '@/app/utils/id';
import { useLocalStorage } from '@/app/utils/localStorage';
import { navigationRoutes, Page } from '@/app/utils/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Define the type for the auth context
export type UserType = 'conciergerie' | 'employee';
export type UserData = Conciergerie | Employee;

interface AuthContextType {
  userId: string | undefined;
  userType: UserType | undefined;
  updateUserType: (userType: UserType | undefined) => void;
  conciergerieName: string | undefined;
  setConciergerieName: (name: string | undefined) => void;
  sentEmailError: boolean | undefined;
  setSentEmailError: (sentEmailError: boolean | undefined) => void;
  getUserData: <T extends UserData>() => T | undefined;
  updateUserData: <T extends UserData>(updatedData: T, updateType?: UserType) => void;
  fetchDataFromDatabase: (fetchType?: UserType) => Promise<boolean>;
  conciergeries: Conciergerie[];
  employees: Employee[];
  isLoading: boolean;
  refreshData: () => void;
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
  getUserData: () => undefined,
  updateUserData: () => {},
  fetchDataFromDatabase: () => Promise.resolve(false),
  conciergeries: [],
  employees: [],
  isLoading: false,
  refreshData: () => {},
  disconnect: () => {},
  nuke: () => {},
});

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { onMenuChange } = useMenuContext();

  const [userId, setUserId] = useLocalStorage<string>('user_id');
  const [userType, setUserType] = useLocalStorage<UserType>('user_type');
  const [conciergerieName, setConciergerieName] = useLocalStorage<string>('conciergerie_name');
  const [sentEmailError, setSentEmailError] = useLocalStorage<boolean>('sent_email_error');

  const [userData, setUserData] = useState<UserData>();
  const [conciergeries, setConciergeries] = useState<Conciergerie[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
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
    (userType: UserType | undefined) => {
      setUserType(userType);
      if (userType) {
        setCookie('user_type', userType);
      } else {
        deleteCookie('user_type');
      }
    },
    [setUserType],
  );

  const generateId = useCallback(() => {
    const id = userId ?? generateSimpleId();
    updateUserId(id);
    return id;
  }, [userId, updateUserId]);

  // Function to refresh user data
  const refreshData = useCallback(async () => {
    generateId();
    window.location.reload();
  }, [generateId]);

  // Function to fetch data from the database and store it in the context
  const fetchDataFromDatabase = useCallback(
    async (fetchType?: UserType) => {
      try {
        const id = generateId();

        const fetchedConciergeries =
          !fetchType || fetchType === 'conciergerie' ? await fetchConciergeries() : conciergeries;
        const fetchedEmployees = !fetchType || fetchType === 'employee' ? await fetchEmployees() : employees;

        const foundEmployee = fetchedEmployees.find(e => e.id === id);
        const newUserData = foundEmployee || fetchedConciergeries.find(c => c.id === id);
        const isEmployee = !!newUserData && !!foundEmployee;
        const isConciergerie = (!!newUserData && !isEmployee) || userType === 'conciergerie';
        const newUserType = isEmployee ? 'employee' : isConciergerie ? 'conciergerie' : undefined;
        const newConciergerieName = isConciergerie
          ? newUserData
            ? (newUserData as Conciergerie).name
            : conciergerieName
          : undefined;
        const newPrimaryColor = fetchedConciergeries.find(c => c.name === newConciergerieName)?.color;

        console.warn('Loading data from database');

        setConciergerieName(newConciergerieName);
        setConciergeries(fetchedConciergeries);
        setEmployees(fetchedEmployees);
        updateUserType(newUserType);
        setUserData(newUserData);
        setPrimaryColor(newPrimaryColor);

        // Special case where the userId cookie or the userId in local storage has been manually deleted
        const path = window.location.pathname;
        if (
          (newUserData && !navigationRoutes.includes(path) && userType === 'conciergerie') ||
          (!newUserData && navigationRoutes.includes(path))
        )
          refreshData();

        return true;
      } catch (err) {
        console.error('Error fetching user data from database:', err);
        onMenuChange(Page.Error);
        return false;
      }
    },
    [
      generateId,
      updateUserType,
      userType,
      onMenuChange,
      refreshData,
      conciergerieName,
      setConciergerieName,
      conciergeries,
      employees,
    ],
  );

  // Initialize the auth provider
  useEffect(() => {
    setIsLoading(true);
    // Only run this once when the component mounts
    fetchDataFromDatabase().then(() => {
      setIsLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getUserData = <T extends Employee | Conciergerie>(): T | undefined => {
    if (userType === 'employee') {
      return userData as T; // Assumes T is Employee
    } else if (userType === 'conciergerie') {
      return userData as T; // Assumes T is Conciergerie
    }
    return undefined;
  };

  const updateUserData = <T extends Employee | Conciergerie>(updatedData: T, updateType = userType) => {
    // Update user data only if the update type matches the current user type (meaning we are updating the current user)
    if (updateType === userType) setUserData(updatedData);

    // Update employees or conciergeries list
    if (updateType === 'employee') {
      setEmployees(prev => {
        if (!prev) return [updatedData as Employee];
        const exists = prev.some(e => e.id === updatedData.id);
        if (exists) {
          return prev.map(e => (e.id === updatedData.id ? (updatedData as Employee) : e));
        }
        return [...prev, updatedData as Employee];
      });
    } else if (updateType === 'conciergerie') {
      setConciergeries(prev => {
        if (!prev) return [updatedData as Conciergerie];
        const exists = prev.some(c => c.id === updatedData.id);
        if (exists) {
          return prev.map(c => (c.id === updatedData.id ? (updatedData as Conciergerie) : c));
        }
        return [...prev, updatedData as Conciergerie];
      });
    }
  };

  const disconnect = () => {
    // Clear all data from localStorage
    updateUserId(undefined);
    updateUserType(undefined);
    setConciergerieName(undefined);
    setSentEmailError(undefined);

    // Force a full page reload to reset the app state
    refreshData();
  };

  const nuke = () => {
    // Clear all data from localStorage
    localStorage.clear();

    // Force a full page reload to reset the app state
    refreshData();
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
        getUserData,
        updateUserData,
        fetchDataFromDatabase,
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
