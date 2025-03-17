import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const state = useState<T>(() => getLocalStorageItem(key, defaultValue));
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

export function getLocalStorageItem<T>(key: string, defaultValue: T) {
  if (!key) {
    console.warn('useLocalStorage: key is not defined');
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

export function setLocalStorageItem<T>(key: string, value: T) {
  if (!key) {
    console.warn('useLocalStorage: key is not defined');
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
