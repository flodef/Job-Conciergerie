'use client';

import { useEffect } from 'react';
import { useEmailRetry } from '@/app/utils/emailRetry';
import { Conciergerie, Employee, Home, Mission } from '@/app/types/dataTypes';
import {
  sendConciergerieVerificationEmail,
  sendEmployeeRegistrationEmail,
  sendEmployeeAcceptanceEmail,
  sendMissionStatusChangeEmail,
  sendLateCompletionEmail,
  sendMissionAcceptanceToEmployeeEmail,
  sendMissionUpdatedToEmployeeEmail,
  sendMissionRemovedToEmployeeEmail
} from '@/app/actions/email';
import { useAuth } from '@/app/contexts/authProvider';
import { Toast, ToastType } from '@/app/components/toastMessage';

const MAX_ATTEMPTS = 20;
const RETRY_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

export function EmailRetryManager({ onToastChange }: { onToastChange: (toast: Toast | undefined) => void }) {
  const { failedEmails, removeEmail, updateEmail } = useEmailRetry();
  const { userId } = useAuth();

  // Process retry queue
  useEffect(() => {
    if (!failedEmails || failedEmails.length === 0) return;

    const retryEmails = () => {
      for (const email of failedEmails) {
        // Don't retry too frequently
        if (Date.now() - email.lastAttempt < RETRY_INTERVAL) continue;

        // Max attempts reached - stop retrying
        if (email.attempts >= MAX_ATTEMPTS) {
          removeEmail(email.id);
          continue;
        }

        // Update last attempt time and increment attempts count
        updateEmail(email.id, {
          lastAttempt: Date.now(),
          attempts: email.attempts + 1,
        });

        // Using then/catch pattern instead of async/await per user preference
        switch (email.type) {
          case 'verification':
            if (userId) {
              sendConciergerieVerificationEmail(email.data as unknown as Conciergerie, userId, email.id)
                .then(isSuccess => {
                  if (isSuccess) handleEmailSuccess(email);
                })
                .catch(err => console.error('Error retrying verification email:', err));
            }
            break;
          case 'registration':
            sendEmployeeRegistrationEmail(
              email.data.conciergerie as unknown as Conciergerie,
              email.data.employee as unknown as Employee,
              email.id
            )
              .then(isSuccess => {
                if (isSuccess) handleEmailSuccess(email);
              })
              .catch(err => console.error('Error retrying registration email:', err));
            break;
          case 'acceptance':
            sendEmployeeAcceptanceEmail(
              email.data.employee as unknown as Employee,
              email.data.conciergerie as unknown as Conciergerie,
              email.data.missionsCount as number,
              email.data.isAccepted as boolean,
              email.id
            )
              .then(isSuccess => {
                if (isSuccess) handleEmailSuccess(email);
              })
              .catch(err => console.error('Error retrying acceptance email:', err));
            break;
          case 'missionStatus':
            sendMissionStatusChangeEmail(
              email.data.mission as unknown as Mission,
              email.data.home as unknown as Home,
              email.data.employee as unknown as Employee,
              email.data.conciergerie as unknown as Conciergerie,
              email.data.status as 'accepted' | 'started' | 'completed',
              email.id
            )
              .then(isSuccess => {
                if (isSuccess) handleEmailSuccess(email);
              })
              .catch(err => console.error('Error retrying mission status email:', err));
            break;
          case 'lateCompletion':
            sendLateCompletionEmail(
              email.data.mission as unknown as Mission,
              email.data.home as unknown as Home,
              email.data.employee as unknown as Employee,
              email.data.conciergerie as unknown as Conciergerie,
              email.id
            )
              .then(isSuccess => {
                if (isSuccess) handleEmailSuccess(email);
              })
              .catch(err => console.error('Error retrying late completion email:', err));
            break;
          case 'missionAcceptance':
            sendMissionAcceptanceToEmployeeEmail(
              email.data.mission as unknown as Mission,
              email.data.home as unknown as Home,
              email.data.employee as unknown as Employee,
              email.data.conciergerie as unknown as Conciergerie,
              email.id
            )
              .then(isSuccess => {
                if (isSuccess) handleEmailSuccess(email);
              })
              .catch(err => console.error('Error retrying mission acceptance email:', err));
            break;
          case 'missionUpdated':
            sendMissionUpdatedToEmployeeEmail(
              email.data.mission as unknown as Mission,
              email.data.home as unknown as Home,
              email.data.employee as unknown as Employee,
              email.data.conciergerie as unknown as Conciergerie,
              email.data.changes as string[],
              email.id
            )
              .then(isSuccess => {
                if (isSuccess) handleEmailSuccess(email);
              })
              .catch(err => console.error('Error retrying mission updated email:', err));
            break;
          case 'missionRemoved':
            sendMissionRemovedToEmployeeEmail(
              email.data.mission as unknown as Mission,
              email.data.home as unknown as Home,
              email.data.employee as unknown as Employee,
              email.data.conciergerie as unknown as Conciergerie,
              email.data.type as 'deleted' | 'canceled',
              email.id
            )
              .then(isSuccess => {
                if (isSuccess) handleEmailSuccess(email);
              })
              .catch(err => console.error('Error retrying mission removed email:', err));
            break;
        }
      }
    };

    // Define helper function for handling successful email sending
    const handleEmailSuccess = (email: { id: string; attempts: number }) => {
      // If email sent successfully, remove from queue
      removeEmail(email.id);

      // Show success toast if this was a retry (attempts > 1)
      if (email.attempts > 1) {
        onToastChange({
          type: ToastType.Success,
          message: 'Email envoyé avec succès après plusieurs tentatives',
        });
      }
    };

    // Initial check
    retryEmails();

    // Set up interval to check periodically
    const intervalId = setInterval(retryEmails, 60 * 1000); // Check every minute

    return () => clearInterval(intervalId);
  }, [failedEmails, removeEmail, updateEmail, userId, onToastChange]);

  return null; // This is a background component with no UI
}
