'use client';

import { fetchConciergeries } from '@/app/actions/conciergerie';
import { deleteEmployeeData, fetchEmployees } from '@/app/actions/employee';
import { syncSession } from '@/app/actions/session';
import type { Toast } from '@/app/components/toastMessage';
import { ToastMessage, ToastType } from '@/app/components/toastMessage';
import type { Conciergerie, Employee } from '@/app/types/dataTypes';
import { setPrimaryColor } from '@/app/utils/color';
import { deleteCookie, setCookie } from '@/app/utils/cookies';
import { isConnectionPoolError } from '@/app/utils/dbErrors';
import { containsId, generateSecureId, hashIdAsync } from '@/app/utils/id';
import { getLocalStorageItem, useLocalStorage } from '@/app/utils/localStorage';
import { navigationRoutes } from '@/app/utils/navigation';
import { getUserKey, type UserData } from '@/app/utils/user';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { validateSupabaseConfig } from '../actions/environment';

// Define the type for the auth context
export type UserType = 'conciergerie' | 'employee';

interface AuthContextType {
  userId: string | undefined;
  /** sha256 of userId — device ids are hashed at rest, so own-row entries compare against this */
  userIdHash: string | undefined;
  userType: UserType | undefined;
  userData: UserData | undefined;
  isEmployee: boolean;
  isConciergerie: boolean;
  /** Super-admin session (member of an is_admin client) — unscoped tenant view. */
  isAdmin: boolean;
  /** Admin currently viewing the app as another row. */
  impersonating: boolean;
  /** rowKey of the impersonated row (undefined when not impersonating). */
  impersonatedName: string | undefined;
  updateUserId: (userId: string | undefined) => void;
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
  userIdHash: undefined,
  userType: undefined,
  userData: undefined,
  isEmployee: false,
  isConciergerie: false,
  isAdmin: false,
  impersonating: false,
  impersonatedName: undefined,
  updateUserId: () => {},
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
  const [userIdHash, setUserIdHash] = useState<string>();
  const [userType, setUserType] = useLocalStorage<UserType>('user_type');
  const [conciergerieName, setConciergerieName] = useLocalStorage<string>('conciergerie_name');
  const [conciergeries, setConciergeries] = useState<Conciergerie[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [employeeName, setEmployeeName] = useState<string>();
  const [userData, setUserData] = useState<UserData>();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [impersonating, setImpersonating] = useState<boolean>(false);
  const [impersonatedName, setImpersonatedName] = useState<string>();
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
  // Keep the sha256 of the raw device id in sync — the rows' `id` arrays are
  // hashed at rest, so all own-row comparisons happen in the hash domain.
  useEffect(() => {
    let cancelled = false;
    if (userId)
      hashIdAsync(userId)
        .then(h => !cancelled && setUserIdHash(h))
        // crypto.subtle unavailable (non-secure context) — '' = "resolved but
        // unavailable"; raw compare still works pre-migration. Keeping
        // undefined would mean "still computing" forever (see [id]/page gate).
        .catch(() => !cancelled && setUserIdHash(''));
    else setUserIdHash(undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
    const id = userId || getLocalStorageItem<string>('user_id') || generateSecureId();
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
      // Sync the session first: rotates legacy credentials server-side and returns the canonical id
      const session = await syncSession();
      if (session?.userId) {
        if (session.userId !== getLocalStorageItem<string>('user_id')) updateUserId(session.userId);
        if (session.userType) updateUserType(session.userType);
      }
      const impersonating = session?.impersonating ?? false;
      setIsAdmin(session?.isAdmin ?? false);
      setImpersonating(impersonating);
      setImpersonatedName(impersonating ? session?.rowKey : undefined);

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

      // Own-row ids are hashed at rest — compare in both domains (pre-migration
      // rows still hold raw ids)
      const idHash = await hashIdAsync(id).catch(() => undefined);
      const findUserById = <T extends UserData>(users: T[] | null, deviceId: string) =>
        users?.find(user => containsId(user.id, deviceId) || (!!idHash && containsId(user.id, idHash)));

      // Impersonated sessions resolve the target row by its business key —
      // the admin's device id only matches the admin row, never the target's.
      const foundEmployee = impersonating
        ? session?.userType === 'employee'
          ? effectiveEmployees?.find(e => getUserKey(e) === session.rowKey)
          : undefined
        : findUserById(effectiveEmployees, id);
      const foundConciergerie = impersonating
        ? session?.userType === 'conciergerie'
          ? effectiveConciergeries?.find(c => getUserKey(c) === session.rowKey)
          : undefined
        : findUserById(effectiveConciergeries, id);
      const newUserData = foundEmployee || foundConciergerie;
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
      // Only redirect if data was actually fetched (not just preserved fallback).
      // Both lists must have loaded — a failed query can't prove the user is
      // absent, and reloading on a DB error just loops forever.
      const path = window.location.pathname;
      if (fetchedConciergeries !== null && fetchedEmployees !== null) {
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
      updateUserId,
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

    // Validate Supabase configuration (logs error if mismatch)
    validateSupabaseConfig().then(isValid => {
      if (isValid) console.log('[Supabase Config] OK: NEXT_PUBLIC_SUPABASE_URL and DATABASE_URL match project ID:');
      else
        console.error(
          '[Supabase Config] ERROR: NEXT_PUBLIC_SUPABASE_URL and DATABASE_URL do not point to the same project.',
        );
    });

    // Only run this once when the component mounts
    fetchDataFromDatabase()
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Retry connection after toast is dismissed — but only for transient pool
  // exhaustion, and at most once per 30s: for permanent failures (pending,
  // expired, revoked session) an unconditional retry-on-close creates an
  // infinite toast→retry→toast loop hammering the DB.
  const lastAutoRetryRef = useRef(0);
  const handleToastClose = useCallback(() => {
    const failedToast = toast;
    setToast(undefined);
    if (!failedToast?.error || !isConnectionPoolError(failedToast.error)) return;
    if (Date.now() - lastAutoRetryRef.current < 30_000) return;
    lastAutoRetryRef.current = Date.now();
    setTimeout(() => {
      setIsLoading(true);
      fetchDataFromDatabase()
        .then(() => setIsLoading(false))
        .catch(() => setIsLoading(false));
    }, 1000);
  }, [fetchDataFromDatabase, toast]);

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
        userIdHash,
        userType,
        userData,
        isEmployee,
        isConciergerie,
        isAdmin,
        impersonating,
        impersonatedName,
        updateUserId,
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
