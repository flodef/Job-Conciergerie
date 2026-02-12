'use client';

import {
  sendConciergerieVerificationEmail,
  sendEmployeeRegistrationEmail,
  sendEmployeeAcceptanceEmail,
  sendMissionStatusChangeEmail,
  sendLateCompletionEmail,
  sendMissionAcceptanceToEmployeeEmail,
  sendMissionUpdatedToEmployeeEmail,
  sendMissionRemovedToEmployeeEmail,
  sendNewDeviceNotificationEmail,
} from '@/app/actions/email';
import { EmailType } from '@/app/utils/emailRetry';
import { Conciergerie, Employee, Home, Mission, MissionStatus } from '@/app/types/dataTypes';
import { Toast, ToastType } from '@/app/components/toastMessage';

// This is a client-side utility to send emails with automatic retry capability
// It will handle failures by adding them to the retry queue

export type EmailSenderProps = {
  addFailedEmail: (type: EmailType, data: Record<string, unknown>) => string;
  setToast?: (toast: Toast | undefined) => void;
  showSuccessToast?: boolean;
};

/**
 * Generic handler for all email sending operations
 * This reduces code duplication across all email sender functions
 */
const handleEmailSending = async <T extends unknown[]>(
  { addFailedEmail, setToast, showSuccessToast = false }: EmailSenderProps,
  emailType: EmailType,
  serverAction: (...args: T) => Promise<boolean>,
  args: T,
  retryData: Record<string, unknown>,
  successMessage: string = "L'email a été envoyé avec succès",
) => {
  return serverAction(...args)
    .then(isSuccess => {
      if (isSuccess) {
        if (showSuccessToast && setToast) {
          setToast({
            type: ToastType.Success,
            message: successMessage,
          });
        }
        return true;
      } else {
        // Add to retry queue
        addFailedEmail(emailType, retryData);

        if (setToast) {
          setToast({
            type: ToastType.Info,
            message: "L'email sera envoyé automatiquement dès que possible",
          });
        }
        return false;
      }
    })
    .catch(error => {
      console.error(`Error sending ${emailType} email:`, error);

      // Add to retry queue
      addFailedEmail(emailType, retryData);

      if (setToast) {
        setToast({
          type: ToastType.Error,
          message: 'Une erreur est survenue. Nous réessaierons automatiquement.',
        });
      }
      return false;
    });
};

export const EmailSender = {
  // Sending email with verification for a conciergerie
  sendVerificationEmail: (props: EmailSenderProps, conciergerie: Conciergerie, userId: string) => {
    return handleEmailSending(
      props,
      'verification',
      sendConciergerieVerificationEmail,
      [conciergerie, userId],
      { ...conciergerie },
      "L'email de vérification a été envoyé avec succès",
    );
  },

  // Sending registration notification for employee
  sendRegistrationEmail: (props: EmailSenderProps, conciergerie: Conciergerie, employee: Employee) => {
    return handleEmailSending(
      props,
      'registration',
      sendEmployeeRegistrationEmail,
      [conciergerie, employee],
      {
        conciergerie,
        employee,
      },
      "L'email de notification a été envoyé avec succès",
    );
  },

  // Sending acceptance/rejection notification to employee
  sendAcceptanceEmail: (
    props: EmailSenderProps,
    employee: Employee,
    conciergerie: Conciergerie,
    missionsCount: number,
    isAccepted: boolean,
  ) => {
    return handleEmailSending(
      props,
      'acceptance',
      sendEmployeeAcceptanceEmail,
      [employee, conciergerie, missionsCount, isAccepted],
      {
        employee,
        conciergerie,
        missionsCount,
        isAccepted,
      },
      "L'email de notification a été envoyé avec succès",
    );
  },

  // Sending mission status change notification
  sendMissionStatusEmail: (
    props: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    status: MissionStatus,
  ) => {
    return handleEmailSending(
      props,
      'missionStatus',
      sendMissionStatusChangeEmail,
      [mission, home, employee, conciergerie, status],
      {
        mission,
        home,
        employee,
        conciergerie,
        status,
      },
      "L'email de notification a été envoyé avec succès",
    );
  },

  // Sending late completion notification
  sendLateCompletionEmail: (
    props: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
  ) => {
    return handleEmailSending(
      props,
      'lateCompletion',
      sendLateCompletionEmail,
      [mission, home, employee, conciergerie],
      {
        mission,
        home,
        employee,
        conciergerie,
      },
      "L'email d'alerte de retard a été envoyé avec succès",
    );
  },

  // Sending mission acceptance confirmation to employee
  sendMissionAcceptanceEmail: (
    props: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
  ) => {
    return handleEmailSending(
      props,
      'missionAcceptance',
      sendMissionAcceptanceToEmployeeEmail,
      [mission, home, employee, conciergerie],
      {
        mission,
        home,
        employee,
        conciergerie,
      },
      "L'email de confirmation a été envoyé avec succès",
    );
  },

  // Sending mission update notification to employee
  sendMissionUpdatedEmail: (
    props: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    changes: string[],
  ) => {
    return handleEmailSending(
      props,
      'missionUpdated',
      sendMissionUpdatedToEmployeeEmail,
      [mission, home, employee, conciergerie, changes],
      {
        mission,
        home,
        employee,
        conciergerie,
        changes,
      },
      "L'email de mise à jour a été envoyé avec succès",
    );
  },

  // Sending mission deleted/canceled notification to employee
  sendMissionRemovedEmail: (
    props: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    type: 'deleted' | 'canceled',
  ) => {
    const action = type === 'deleted' ? 'suppression' : 'annulation';
    return handleEmailSending(
      props,
      'missionRemoved',
      sendMissionRemovedToEmployeeEmail,
      [mission, home, employee, conciergerie, type],
      {
        mission,
        home,
        employee,
        conciergerie,
        type,
      },
      `L'email de ${action} a été envoyé avec succès`,
    );
  },

  // Sending new device connection notification to employee
  sendNewDeviceEmail: (props: EmailSenderProps, employee: Employee, userId: string) => {
    return handleEmailSending(
      props,
      'newDevice',
      sendNewDeviceNotificationEmail,
      [employee, userId],
      { employee, userId },
      "L'email de notification de nouvel appareil a été envoyé avec succès",
    );
  },
};
