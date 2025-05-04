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
import { Conciergerie, Employee, Home, Mission } from '@/app/types/dataTypes';
import { Toast, ToastType } from '@/app/components/toastMessage';

// This is a client-side utility to send emails with automatic retry capability
// It will handle failures by adding them to the retry queue

export type EmailSenderProps = {
  addFailedEmail: (type: EmailType, data: Record<string, unknown>) => string;
  setToast?: (toast: Toast | undefined) => void;
  showSuccessToast?: boolean;
};

export const EmailSender = {
  // Sending email with verification for a conciergerie
  sendVerificationEmail: (
    { addFailedEmail, setToast, showSuccessToast = false }: EmailSenderProps,
    conciergerie: Conciergerie, 
    userId: string
  ) => {
    return sendConciergerieVerificationEmail(conciergerie, userId)
      .then(isSuccess => {
        if (isSuccess) {
          if (showSuccessToast && setToast) {
            setToast({
              type: ToastType.Success,
              message: "L'email de vérification a été envoyé avec succès",
            });
          }
          return true;
        } else {
          // Add to retry queue
          addFailedEmail('verification', { ...conciergerie });
          
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
        console.error('Error sending verification email:', error);
        
        // Add to retry queue
        addFailedEmail('verification', { ...conciergerie });
        
        if (setToast) {
          setToast({
            type: ToastType.Error,
            message: "Une erreur est survenue. Nous réessaierons automatiquement.",
          });
        }
        return false;
      });
  },
  
  // Sending registration notification for employee
  sendRegistrationEmail: (
    { addFailedEmail, setToast, showSuccessToast = false }: EmailSenderProps,
    conciergerie: Conciergerie, 
    employee: Employee
  ) => {
    return sendEmployeeRegistrationEmail(conciergerie, employee)
      .then(isSuccess => {
        if (isSuccess) {
          if (showSuccessToast && setToast) {
            setToast({
              type: ToastType.Success,
              message: "L'email de notification a été envoyé avec succès",
            });
          }
          return true;
        } else {
          // Add to retry queue
          addFailedEmail('registration', {
            conciergerie,
            employee,
          });
          
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
        console.error('Error sending registration email:', error);
        
        // Add to retry queue
        addFailedEmail('registration', {
          conciergerie,
          employee,
        });
        
        if (setToast) {
          setToast({
            type: ToastType.Error,
            message: "Une erreur est survenue. Nous réessaierons automatiquement.",
          });
        }
        return false;
      });
  },
  
  // Sending acceptance/rejection notification to employee
  sendAcceptanceEmail: (
    { addFailedEmail, setToast, showSuccessToast = false }: EmailSenderProps,
    employee: Employee,
    conciergerie: Conciergerie,
    missionsCount: number,
    isAccepted: boolean
  ) => {
    return sendEmployeeAcceptanceEmail(employee, conciergerie, missionsCount, isAccepted)
      .then(isSuccess => {
        if (isSuccess) {
          if (showSuccessToast && setToast) {
            setToast({
              type: ToastType.Success,
              message: "L'email de notification a été envoyé avec succès",
            });
          }
          return true;
        } else {
          // Add to retry queue
          addFailedEmail('acceptance', {
            employee,
            conciergerie,
            missionsCount,
            isAccepted,
          });
          
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
        console.error('Error sending acceptance email:', error);
        
        // Add to retry queue
        addFailedEmail('acceptance', {
          employee,
          conciergerie,
          missionsCount,
          isAccepted,
        });
        
        if (setToast) {
          setToast({
            type: ToastType.Error,
            message: "Une erreur est survenue. Nous réessaierons automatiquement.",
          });
        }
        return false;
      });
  },
  
  // Sending mission status change notification
  sendMissionStatusEmail: (
    { addFailedEmail, setToast, showSuccessToast = false }: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    status: 'accepted' | 'started' | 'completed'
  ) => {
    return sendMissionStatusChangeEmail(mission, home, employee, conciergerie, status)
      .then(isSuccess => {
        if (isSuccess) {
          if (showSuccessToast && setToast) {
            setToast({
              type: ToastType.Success,
              message: "L'email de notification a été envoyé avec succès",
            });
          }
          return true;
        } else {
          // Add to retry queue
          addFailedEmail('missionStatus', {
            mission,
            home,
            employee,
            conciergerie,
            status,
          });
          
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
        console.error('Error sending mission status email:', error);
        
        // Add to retry queue
        addFailedEmail('missionStatus', {
          mission,
          home,
          employee,
          conciergerie,
          status,
        });
        
        if (setToast) {
          setToast({
            type: ToastType.Error,
            message: "Une erreur est survenue. Nous réessaierons automatiquement.",
          });
        }
        return false;
      });
  },
  
  // Sending late completion notification
  sendLateCompletionEmail: (
    { addFailedEmail, setToast, showSuccessToast = false }: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie
  ) => {
    return sendLateCompletionEmail(mission, home, employee, conciergerie)
      .then(isSuccess => {
        if (isSuccess) {
          if (showSuccessToast && setToast) {
            setToast({
              type: ToastType.Success,
              message: "L'email d'alerte de retard a été envoyé avec succès",
            });
          }
          return true;
        } else {
          // Add to retry queue
          addFailedEmail('lateCompletion', {
            mission,
            home,
            employee,
            conciergerie,
          });
          
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
        console.error('Error sending late completion email:', error);
        
        // Add to retry queue
        addFailedEmail('lateCompletion', {
          mission,
          home,
          employee,
          conciergerie,
        });
        
        if (setToast) {
          setToast({
            type: ToastType.Error,
            message: "Une erreur est survenue. Nous réessaierons automatiquement.",
          });
        }
        return false;
      });
  },
  
  // Sending mission acceptance confirmation to employee
  sendMissionAcceptanceEmail: (
    { addFailedEmail, setToast, showSuccessToast = false }: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie
  ) => {
    return sendMissionAcceptanceToEmployeeEmail(mission, home, employee, conciergerie)
      .then(isSuccess => {
        if (isSuccess) {
          if (showSuccessToast && setToast) {
            setToast({
              type: ToastType.Success,
              message: "L'email de confirmation a été envoyé avec succès",
            });
          }
          return true;
        } else {
          // Add to retry queue
          addFailedEmail('missionAcceptance', {
            mission,
            home,
            employee,
            conciergerie,
          });
          
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
        console.error('Error sending mission acceptance email:', error);
        
        // Add to retry queue
        addFailedEmail('missionAcceptance', {
          mission,
          home,
          employee,
          conciergerie,
        });
        
        if (setToast) {
          setToast({
            type: ToastType.Error,
            message: "Une erreur est survenue. Nous réessaierons automatiquement.",
          });
        }
        return false;
      });
  },
  
  // Sending mission update notification to employee
  sendMissionUpdatedEmail: (
    { addFailedEmail, setToast, showSuccessToast = false }: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    changes: string[]
  ) => {
    return sendMissionUpdatedToEmployeeEmail(mission, home, employee, conciergerie, changes)
      .then(isSuccess => {
        if (isSuccess) {
          if (showSuccessToast && setToast) {
            setToast({
              type: ToastType.Success,
              message: "L'email de mise à jour a été envoyé avec succès",
            });
          }
          return true;
        } else {
          // Add to retry queue
          addFailedEmail('missionUpdated', {
            mission,
            home,
            employee,
            conciergerie,
            changes,
          });
          
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
        console.error('Error sending mission updated email:', error);
        
        // Add to retry queue
        addFailedEmail('missionUpdated', {
          mission,
          home,
          employee,
          conciergerie,
          changes,
        });
        
        if (setToast) {
          setToast({
            type: ToastType.Error,
            message: "Une erreur est survenue. Nous réessaierons automatiquement.",
          });
        }
        return false;
      });
  },
  
  // Sending mission deleted/canceled notification to employee
  sendMissionRemovedEmail: (
    { addFailedEmail, setToast, showSuccessToast = false }: EmailSenderProps,
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    type: 'deleted' | 'canceled'
  ) => {
    return sendMissionRemovedToEmployeeEmail(mission, home, employee, conciergerie, type)
      .then(isSuccess => {
        if (isSuccess) {
          if (showSuccessToast && setToast) {
            setToast({
              type: ToastType.Success,
              message: "L'email de notification a été envoyé avec succès",
            });
          }
          return true;
        } else {
          // Add to retry queue
          addFailedEmail('missionRemoved', {
            mission,
            home,
            employee,
            conciergerie,
            type,
          });
          
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
        console.error('Error sending mission removed email:', error);
        
        // Add to retry queue
        addFailedEmail('missionRemoved', {
          mission,
          home,
          employee,
          conciergerie,
          type,
        });
        
        if (setToast) {
          setToast({
            type: ToastType.Error,
            message: "Une erreur est survenue. Nous réessaierons automatiquement.",
          });
        }
        return false;
      });
  },

  // Sending new device connection notification to employee
  sendNewDeviceEmail: (
    { addFailedEmail, setToast, showSuccessToast = false }: EmailSenderProps,
    employee: Employee
  ) => {
    return sendNewDeviceNotificationEmail(employee)
      .then(isSuccess => {
        if (isSuccess) {
          if (showSuccessToast && setToast) {
            setToast({
              type: ToastType.Success,
              message: "L'email de notification de nouvel appareil a été envoyé avec succès",
            });
          }
          return true;
        } else {
          // Add to retry queue
          addFailedEmail('newDevice', { employee });
          
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
        console.error('Error sending new device notification email:', error);
        
        // Add to retry queue
        addFailedEmail('newDevice', { employee });
        
        if (setToast) {
          setToast({
            type: ToastType.Error,
            message: "Une erreur est survenue. Nous réessaierons automatiquement.",
          });
        }
        return false;
      });
  },
};
