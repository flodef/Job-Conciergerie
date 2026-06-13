'use client';

import { fetchConciergeries } from '@/app/actions/conciergerie';
import { deleteEmployeeData, fetchEmployees } from '@/app/actions/employee';
import type { Toast } from '@/app/components/toastMessage';
import { ToastMessage, ToastType } from '@/app/components/toastMessage';
import type { Conciergerie, Employee } from '@/app/types/dataTypes';
import { setPrimaryColor } from '@/app/utils/color';
import { deleteCookie, setCookie } from '@/app/utils/cookies';
import { isConnectionPoolError } from '@/app/utils/dbErrors';
import { containsId, generateSimpleId } from '@/app/utils/id';
import { getLocalStorageItem, useLocalStorage } from '@/app/utils/localStorage';
import { navigationRoutes } from '@/app/utils/navigation';
import { getUserKey, type UserData } from '@/app/utils/user';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Define the type for the auth context
export type UserType = 'conciergerie' | 'employee';

interface AuthContextType {
  userId: string | undefined;
  userType: UserType | undefined;
  userData: UserData | undefined;
  isEmployee: boolean;
  isConciergerie: boolean;
  updateUserType: (userType: UserType | undefined) => void;
  conciergerieName: string | undefined;
  setConciergerieName: (name: string | undefined) => void;
  employeeName: string | undefined;
  findEmployee: (id: string | null | undefined) => Employee | undefined;
  findConciergerie: (id: string | null | undefined) => Conciergerie | undefined;
  deleteEmployee: (employee: Employee) => Promise<boolean>;
  updateUserData: <T extends UserData>(updatedData: T, updateType?: UserType) => void;
  fetchDataFromDatabase: (fetchType?: UserType) => Promise<boolean>;
  conciergeries: Conciergerie[];
  employees: Employee[];
  isLoading: boolean;
  refreshData: () => void;
  disconnect: () => void;
  nuke: () => void;
  generateId: () => string;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  userId: undefined,
  userType: undefined,
  userData: undefined,
  isEmployee: false,
  isConciergerie: false,
  updateUserType: () => {},
  conciergerieName: undefined,
  setConciergerieName: () => {},
  employeeName: undefined,
  findEmployee: () => undefined,
  findConciergerie: () => undefined,
  deleteEmployee: () => Promise.resolve(false),
  updateUserData: () => {},
  fetchDataFromDatabase: () => Promise.resolve(false),
  conciergeries: [],
  employees: [],
  isLoading: false,
  refreshData: () => {},
  disconnect: () => {},
  nuke: () => {},
  generateId: () => '',
});

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useLocalStorage<string>('user_id');
  const [userType, setUserType] = useLocalStorage<UserType>('user_type');
  const [conciergerieName, setConciergerieName] = useLocalStorage<string>('conciergerie_name');
  const [conciergeries, setConciergeries] = useState<Conciergerie[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [employeeName, setEmployeeName] = useState<string>();
  const [userData, setUserData] = useState<UserData>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<Toast>();

  const isEmployee = userType === 'employee';
  const isConciergerie = userType === 'conciergerie';

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
    const id = userId || getLocalStorageItem<string>('user_id') || generateSimpleId();
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
      const id = generateId();
      // Read directly from localStorage to avoid stale closure values from SSR hydration
      const currentUserType = getLocalStorageItem<UserType>('user_type');
      const currentConciergerieName = getLocalStorageItem<string>('conciergerie_name');

      let fetchedConciergeries;
      let fetchedEmployees;

      try {
        fetchedConciergeries = !fetchType || fetchType === 'conciergerie' ? await fetchConciergeries() : conciergeries;
        fetchedEmployees = !fetchType || fetchType === 'employee' ? await fetchEmployees() : employees;
      } catch (error) {
        // Check if this is a connection pool exhaustion error
        if (isConnectionPoolError(error)) {
          console.error('Database connection pool exhausted during auth:', error);
          setToast({
            type: ToastType.Error,
            message: 'Trop de connexions simultanées à la base de données. Veuillez réessayer dans quelques instants.',
            error,
          });
          // Keep existing user data - don't redirect to landing page
          setIsLoading(false);
          return false;
        }
        // For other errors, log and continue (will likely result in redirect to landing)
        console.error('Error fetching user data:', error);
        fetchedConciergeries = null;
        fetchedEmployees = null;
      }

      // If the DB fetch failed entirely (null returned), keep existing data to avoid wiping state
      const effectiveConciergeries = fetchedConciergeries ?? conciergeries;
      const effectiveEmployees = fetchedEmployees ?? employees;

      const findUserById = <T extends UserData>(users: T[] | null, id: string) =>
        users?.find(user => containsId(user.id, id));

      const foundEmployee = findUserById(effectiveEmployees, id);
      const newUserData = foundEmployee || findUserById(effectiveConciergeries, id);
      const isEmployee = !!newUserData && !!foundEmployee;
      const isConciergerie = (!!newUserData && !isEmployee) || currentUserType === 'conciergerie';
      const newUserType = isEmployee ? 'employee' : isConciergerie ? 'conciergerie' : undefined;
      const newConciergerieName = isConciergerie
        ? newUserData
          ? getUserKey(newUserData as Conciergerie)
          : currentConciergerieName
        : undefined;
      const newEmployeeName = isEmployee
        ? newUserData
          ? getUserKey(newUserData as Employee)
          : employeeName
        : undefined;
      const newPrimaryColor = effectiveConciergeries?.find(c => c.name === newConciergerieName)?.color;

      setConciergerieName(newConciergerieName);
      setConciergeries(effectiveConciergeries);
      setEmployeeName(newEmployeeName);
      setEmployees(effectiveEmployees);
      updateUserType(newUserType);
      setUserData(newUserData);
      setPrimaryColor(newPrimaryColor);

      // Special case where the userId cookie or the userId in local storage has been manually deleted
      // Only redirect if data was actually fetched (not just preserved fallback)
      const path = window.location.pathname;
      if (fetchedConciergeries !== null || fetchedEmployees !== null) {
        if (
          (newUserData && !navigationRoutes.includes(path) && currentUserType === 'conciergerie') ||
          (!newUserData && navigationRoutes.includes(path))
        )
          refreshData();
      }

      return true;
    },
    [
      generateId,
      updateUserType,
      refreshData,
      setConciergerieName,
      employeeName,
      setEmployeeName,
      conciergeries,
      employees,
    ],
  );

  // Initialize the auth provider
  useEffect(() => {
    setIsLoading(true);
    // Only run this once when the component mounts
    fetchDataFromDatabase()
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Retry connection after toast is dismissed
  const handleToastClose = useCallback(() => {
    setToast(undefined);
    // Retry connection after a short delay
    setTimeout(() => {
      setIsLoading(true);
      fetchDataFromDatabase()
        .then(() => setIsLoading(false))
        .catch(() => setIsLoading(false));
    }, 1000);
  }, [fetchDataFromDatabase]);

  const updateUserData = <T extends UserData>(updatedData: T, updateType = userType) => {
    // Update user data if we are updating the current user, or if there is no current user yet (new registration)
    if (updateType === userType || !userType) setUserData(updatedData);

    // Update employees or conciergeries list
    const userId = getUserKey(updatedData);
    if (updateType === 'employee') {
      setEmployees(prev => {
        if (!prev) return [updatedData as Employee];
        const exists = prev.some(e => getUserKey(e) === userId);
        if (exists) return prev.map(e => (getUserKey(e) === userId ? (updatedData as Employee) : e));
        return [...prev, updatedData as Employee];
      });
    } else if (updateType === 'conciergerie') {
      setConciergeries(prev => {
        if (!prev) return [updatedData as Conciergerie];
        const exists = prev.some(c => getUserKey(c) === userId);
        if (exists) return prev.map(c => (getUserKey(c) === userId ? (updatedData as Conciergerie) : c));
        return [...prev, updatedData as Conciergerie];
      });
    }
  };

  const findEmployee = (id: string | null | undefined) => (id ? employees.find(e => getUserKey(e) === id) : undefined);
  const findConciergerie = (id: string | null | undefined) =>
    id ? conciergeries.find(c => getUserKey(c) === id) : undefined;

  const deleteEmployee = async (employee: Employee) => {
    const isSuccess = await deleteEmployeeData(employee);
    if (isSuccess) setEmployees(prev => prev?.filter(e => getUserKey(e) !== getUserKey(employee)) ?? []);
    return isSuccess;
  };

  const disconnect = () => {
    // Clear all data from localStorage
    updateUserId(undefined);
    updateUserType(undefined);
    setConciergerieName(undefined);

    // Force a full page reload to reset the app state
    window.location.reload();
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
        userData,
        isEmployee,
        isConciergerie,
        updateUserType,
        conciergerieName,
        setConciergerieName,
        employeeName,
        findEmployee,
        findConciergerie,
        deleteEmployee,
        updateUserData,
        fetchDataFromDatabase,
        conciergeries,
        employees,
        isLoading,
        refreshData,
        disconnect,
        nuke,
        generateId,
      }}
    >
      {toast && <ToastMessage toast={toast} onClose={handleToastClose} />}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
