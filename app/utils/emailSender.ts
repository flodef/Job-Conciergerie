'use client';

import {
  sendConciergerieVerificationEmail,
  sendEmployeeAcceptanceEmail,
  sendEmployeeRegistrationEmail,
  sendLateCompletionEmail,
  sendMissionAcceptanceToEmployeeEmail,
  sendMissionRemovedToEmployeeEmail,
  sendMissionReportEmail,
  sendMissionStatusChangeEmail,
  sendMissionUpdatedToEmployeeEmail,
  sendNewDeviceNotificationEmail,
} from '@/app/actions/email';
import { Conciergerie, Employee, Home, Mission, MissionStatus } from '@/app/types/dataTypes';
import { UserData } from './user';

// Client-side wrapper around the email server actions.
// Server-side now persists failed sends in the failed_emails DB queue
// and a cron job retries them.

const handleEmailSending = async <T extends unknown[]>(serverAction: (...args: T) => Promise<boolean>, args: T) => {
  return serverAction(...args).catch(error => {
    console.error('Error sending email:', error);
    return false;
  });
};

export const EmailSender = {
  sendVerificationEmail: (conciergerie: Conciergerie, userId: string) =>
    handleEmailSending(sendConciergerieVerificationEmail, [conciergerie, userId]),

  sendRegistrationEmail: (conciergerie: Conciergerie, employee: Employee) =>
    handleEmailSending(sendEmployeeRegistrationEmail, [conciergerie, employee]),

  sendAcceptanceEmail: (employee: Employee, conciergerie: Conciergerie, missionsCount: number, isAccepted: boolean) =>
    handleEmailSending(sendEmployeeAcceptanceEmail, [employee, conciergerie, missionsCount, isAccepted]),

  sendMissionStatusEmail: (
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    status: MissionStatus,
  ) => handleEmailSending(sendMissionStatusChangeEmail, [mission, home, employee, conciergerie, status]),

  sendLateCompletionEmail: (mission: Mission, home: Home, employee: Employee, conciergerie: Conciergerie) =>
    handleEmailSending(sendLateCompletionEmail, [mission, home, employee, conciergerie]),

  sendMissionAcceptanceEmail: (mission: Mission, home: Home, employee: UserData, conciergerie: Conciergerie) =>
    handleEmailSending(sendMissionAcceptanceToEmployeeEmail, [mission, home, employee, conciergerie]),

  sendMissionUpdatedEmail: (
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    changes: string[],
  ) => handleEmailSending(sendMissionUpdatedToEmployeeEmail, [mission, home, employee, conciergerie, changes]),

  sendMissionRemovedEmail: (
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    type: 'deleted' | 'canceled',
  ) => handleEmailSending(sendMissionRemovedToEmployeeEmail, [mission, home, employee, conciergerie, type]),

  sendNewDeviceEmail: (employee: Employee, userId: string) =>
    handleEmailSending(sendNewDeviceNotificationEmail, [employee, userId]),

  sendMissionReportEmail: (
    mission: Mission,
    home: Home,
    employee: Employee,
    conciergerie: Conciergerie,
    report: { content: string; images: string[] },
  ) => handleEmailSending(sendMissionReportEmail, [mission, home, employee, conciergerie, report]),
};
