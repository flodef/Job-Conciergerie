'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from './localStorage';

export type EmailType =
  | 'verification'
  | 'registration'
  | 'acceptance'
  | 'missionStatus'
  | 'lateCompletion'
  | 'missionAcceptance'
  | 'missionUpdated'
  | 'missionRemoved';

export interface EmailRetryItem {
  id: string;
  type: EmailType;
  data: Record<string, unknown>;
  createdAt: number;
  lastAttempt: number;
  attempts: number;
}

const RETRY_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
const MAX_ATTEMPTS = 20; // Maximum number of retry attempts (approximately ~3 hours)

export function useEmailRetry() {
  const [failedEmails, setFailedEmails] = useLocalStorage<EmailRetryItem[]>('failed_emails', []);
  const [retrying, setRetrying] = useState(false);

  // Add a failed email to the retry queue
  const addFailedEmail = (type: EmailRetryItem['type'], data: Record<string, unknown>) => {
    const newEmail: EmailRetryItem = {
      id: Math.random().toString(36).substring(2, 15),
      type,
      data,
      createdAt: Date.now(),
      lastAttempt: Date.now(),
      attempts: 1,
    };

    setFailedEmails(current => [...(current || []), newEmail]);
    return newEmail.id;
  };

  // Remove a successful email from the retry queue
  const removeEmail = (id: string) => {
    setFailedEmails(current => (current || []).filter(email => email.id !== id));
  };

  // Update an email in the retry queue
  const updateEmail = (id: string, updates: Partial<EmailRetryItem>) => {
    setFailedEmails(current => (current || []).map(email => (email.id === id ? { ...email, ...updates } : email)));
  };

  // Check if it's time to retry an email
  const shouldRetry = (email: EmailRetryItem) => {
    if (email.attempts >= MAX_ATTEMPTS) return false;
    return Date.now() - email.lastAttempt >= RETRY_INTERVAL;
  };

  // Process all emails that need retrying
  const processRetries = () => {
    if (!failedEmails || failedEmails.length === 0 || retrying) return;

    setRetrying(true);

    const emailsToRetry = failedEmails.filter(shouldRetry);
    if (emailsToRetry.length === 0) {
      setRetrying(false);
      return;
    }

    // We'll handle the actual retry logic in a server action component that will
    // import this emailsToRetry list and process it

    setRetrying(false);
  };

  // Set up interval to check for retries
  useEffect(() => {
    const checkInterval = setInterval(processRetries, RETRY_INTERVAL / 3);

    // Initial check when component mounts
    processRetries();

    return () => clearInterval(checkInterval);
  }, [failedEmails]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    failedEmails,
    addFailedEmail,
    removeEmail,
    updateEmail,
    processRetries,
  };
}
