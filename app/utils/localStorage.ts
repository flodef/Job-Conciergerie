import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue?: T,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
  const [value, setValue] = useState<T | undefined>(defaultValue);

  // Keep a ref to the latest value so functional updates work without re-creating the setter
  const valueRef = useRef<T | undefined>(value);

  // Update ref when value changes (in effect, not during render)
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Hydrate from localStorage after mount (client-only) to avoid SSR mismatch.
  // This effect ONLY reads - it never writes, so re-running it (e.g. in StrictMode)
  // can never overwrite stored data with the default value.
  useEffect(() => {
    const stored = getLocalStorageItem<T>(key);
    if (stored !== undefined) {
      valueRef.current = stored;
      setValue(stored);
    }
  }, [key]);

  // Persist only when the consumer explicitly updates the value.
  const setStoredValue = useCallback<Dispatch<SetStateAction<T | undefined>>>(
    action => {
      const next =
        typeof action === 'function' ? (action as (prev: T | undefined) => T | undefined)(valueRef.current) : action;
      valueRef.current = next;
      setValue(next);
      setLocalStorageItem(key, next);
    },
    [key],
  );

  return [key ? value : defaultValue, setStoredValue];
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
