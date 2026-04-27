'use client';

import {
  sendConciergerieVerificationEmail,
  sendEmployeeAcceptanceEmail,
  sendEmployeeRegistrationEmail,
  sendLateCompletionEmail,
  sendMissionAcceptanceToEmployeeEmail,
  sendMissionRemovedToEmployeeEmail,
  sendMissionStatusChangeEmail,
  sendMissionUpdatedToEmployeeEmail,
  sendNewDeviceNotificationEmail,
} from '@/app/actions/email';
import { Toast, ToastType } from '@/app/components/toastMessage';
import { Conciergerie, Employee, Home, Mission, MissionStatus } from '@/app/types/dataTypes';

// Client-side wrapper around the email server actions.
// Server-side now persists failed sends in the failed_emails DB queue
// and a cron job retries them, so the client only has to display feedback toasts.

export type EmailSenderProps = {
  setToast?: (toast: Toast | undefined) => void;
  showSuccessToast?: boolean;
};

const handleEmailSending = async <T extends unknown[]>(
  { setToast, showSuccessToast = false }: EmailSenderProps,
  serverAction: (...args: T) => Promise<boolean>,
  args: T,
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
        // Server already queued the email for retry
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
      console.error('Error sending email:', error);
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
  sendVerificationEmail: (props: EmailSenderProps, conciergerie: Conciergerie, userId: string) =>
    handleEmailSending(
      props,
      sendConciergerieVerificationEmail,
      [conciergerie, userId],
      "L'email de vérification a été envoyé avec succès",
    ),

  sendRegistrationEmail: (props: EmailSenderProps, conciergerie: Conciergerie, employee: Employee) =>
    handleEmailSending(
      props,
      sendEmployeeRegistrationEmail,
      [conciergerie, employee],
      "L'email de notification a été envoyé avec succès",
    ),

  sendAcceptanceEmail: (
    props: EmailSenderProps,
    employee: Employee,
    conciergerie: Conciergerie,
    missionsCount: number,
    isAccepted: boolean,
  ) =>
    handleEmailSending(
      props,
      sendEmployeeAcceptanceEmail,
      [employee, conciergerie, missionsCount, isAccepted],
      "L'email de notification a été envoyé avec succès",
    ),

  sendMissionStatusEmail: (
    props: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    status: MissionStatus,
  ) =>
    handleEmailSending(
      props,
      sendMissionStatusChangeEmail,
      [mission, home, employee, conciergerie, status],
      "L'email de notification a été envoyé avec succès",
    ),

  sendLateCompletionEmail: (
    props: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
  ) =>
    handleEmailSending(
      props,
      sendLateCompletionEmail,
      [mission, home, employee, conciergerie],
      "L'email d'alerte de retard a été envoyé avec succès",
    ),

  sendMissionAcceptanceEmail: (
    props: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
  ) =>
    handleEmailSending(
      props,
      sendMissionAcceptanceToEmployeeEmail,
      [mission, home, employee, conciergerie],
      "L'email de confirmation a été envoyé avec succès",
    ),

  sendMissionUpdatedEmail: (
    props: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    changes: string[],
  ) =>
    handleEmailSending(
      props,
      sendMissionUpdatedToEmployeeEmail,
      [mission, home, employee, conciergerie, changes],
      "L'email de mise à jour a été envoyé avec succès",
    ),

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
      sendMissionRemovedToEmployeeEmail,
      [mission, home, employee, conciergerie, type],
      `L'email de ${action} a été envoyé avec succès`,
    );
  },

  sendNewDeviceEmail: (props: EmailSenderProps, employee: Employee, userId: string) =>
    handleEmailSending(
      props,
      sendNewDeviceNotificationEmail,
      [employee, userId],
      "L'email de notification de nouvel appareil a été envoyé avec succès",
    ),
};
