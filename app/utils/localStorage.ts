import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue?: T,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
  const [value, setValue] = useState<T | undefined>(defaultValue);

  // Hydrate from localStorage after mount (client-only) to avoid SSR mismatch
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      const stored = getLocalStorageItem<T>(key);
      if (stored !== undefined) setValue(stored);
      return;
    }
    setLocalStorageItem(key, value);
  }, [value, key]);

  return [key ? value : defaultValue, setValue];
}

export function getLocalStorageItem<T>(key: string, defaultValue?: T) {
  if (!key) {
    console.error('useLocalStorage: key is not defined');
    return defaultValue;
  }

  try {
    const value = localStorage.getItem(key);
    if (value) return JSON.parse(value) as T;
  } catch (error) {
    if (typeof window !== 'undefined') {
      console.error(error);
    }
  }
  return defaultValue;
}

export function setLocalStorageItem<T>(key: string, value: T | undefined) {
  if (!key) {
    console.error('useLocalStorage: key is not defined');
    return;
  }

  try {
    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    if (typeof window !== 'undefined') {
      console.error(error);
    }
  }
}
