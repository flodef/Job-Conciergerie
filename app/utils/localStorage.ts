import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue?: T,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
  const state = useState<T | undefined>(() => getLocalStorageItem(key, defaultValue));
  const value = key ? state[0] : defaultValue;

  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    setLocalStorageItem(key, value);
  }, [value, key]);

  return state;
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
