'use client';

import { useState, useEffect, useCallback } from 'react';

type RateLimitState = {
  attempts: number;
  lastAttempt: number; // timestamp
  cooldownEnd: number; // timestamp
};

type RateLimitResult = {
  canAttempt: boolean;
  remainingCooldown: number; // seconds
  attemptsRemaining: number;
  attempt: () => boolean;
  reset: () => void;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_COOLDOWN_MINUTES = 5;

export function useRateLimiter(
  key: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  cooldownMinutes: number = DEFAULT_COOLDOWN_MINUTES,
): RateLimitResult {
  const storageKey = `rate_limit_${key}`;
  const cooldownMs = cooldownMinutes * 60 * 1000;

  const getInitialState = (): RateLimitState => {
    if (typeof window === 'undefined') {
      return { attempts: 0, lastAttempt: 0, cooldownEnd: 0 };
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as RateLimitState;
        // Check if cooldown has expired
        const now = Date.now();
        if (parsed.cooldownEnd && now > parsed.cooldownEnd) {
          return { attempts: 0, lastAttempt: 0, cooldownEnd: 0 };
        }
        return parsed;
      }
    } catch {
      // Invalid stored data, reset
    }
    return { attempts: 0, lastAttempt: 0, cooldownEnd: 0 };
  };

  const [state, setState] = useState<RateLimitState>(getInitialState);
  const [remainingCooldown, setRemainingCooldown] = useState(0);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  // Update remaining cooldown every second
  useEffect(() => {
    const updateCooldown = () => {
      const now = Date.now();
      if (state.cooldownEnd && now < state.cooldownEnd) {
        setRemainingCooldown(Math.ceil((state.cooldownEnd - now) / 1000));
      } else {
        setRemainingCooldown(0);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);

    return () => clearInterval(interval);
  }, [state.cooldownEnd]);

  const canAttempt = state.attempts < maxAttempts && remainingCooldown === 0;
  const attemptsRemaining = Math.max(0, maxAttempts - state.attempts);

  const attempt = useCallback((): boolean => {
    const now = Date.now();

    // Check if we're in cooldown
    if (state.cooldownEnd && now < state.cooldownEnd) {
      return false;
    }

    // Check if max attempts reached
    if (state.attempts >= maxAttempts - 1) {
      // This is the last attempt - set cooldown
      setState({
        attempts: state.attempts + 1,
        lastAttempt: now,
        cooldownEnd: now + cooldownMs,
      });
      return true;
    }

    // Normal attempt
    setState({
      attempts: state.attempts + 1,
      lastAttempt: now,
      cooldownEnd: 0,
    });
    return true;
  }, [state, cooldownMs, maxAttempts]);

  const reset = useCallback(() => {
    setState({ attempts: 0, lastAttempt: 0, cooldownEnd: 0 });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return {
    canAttempt,
    remainingCooldown,
    attemptsRemaining,
    attempt,
    reset,
  };
}
