import packageJson from '@/package.json';
import { useEffect, useState } from 'react';
import { milliToMin } from '../utils/date';

const CHECK_INTERVAL_MS = 10 * milliToMin; // 10 minutes

export function useUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json();
        if (version !== packageJson.version) setUpdateAvailable(true);
      } catch {
        // silently ignore network errors
      }
    };

    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return updateAvailable;
}
