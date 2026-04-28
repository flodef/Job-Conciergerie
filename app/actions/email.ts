'use server';

import { insertFailedEmail } from '@/app/db/failedEmailsDb';
import { Conciergerie, Employee, Home, Mission, MissionStatus } from '@/app/types/dataTypes';
import { formatDateTime } from '@/app/utils/date';
import nodemailer, { SendMailOptions } from 'nodemailer';

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Low-level SMTP send - returns { success, error }
async function sendEmail(email: SendMailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    await transporter.sendMail({
      ...email,
      from: `"Job Conciergerie" <${process.env.SMTP_FROM_EMAIL}>`,
      bcc: 'contact@job-conciergerie.fr',
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Attempt to send an email. If SMTP fails AND this is not itself a retry call,
 * the payload is persisted in the failed_emails queue so the cron job can retry later.
 */
async function deliver(
  email: SendMailOptions,
  type: FailedEmailType,
  payload: Record<string, unknown>,
  isRetry: boolean,
): Promise<boolean> {
  const { success, error } = await sendEmail(email);
  if (!success && !isRetry) {
    await insertFailedEmail(type, payload, error);
  }
  return success;
}

// Base URL for the app
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type FailedEmailType =
  | 'verification'
  | 'registration'
  | 'acceptance'
  | 'missionStatus'
  | 'lateCompletion'
  | 'missionAcceptance'
  | 'missionUpdated'
  | 'missionRemoved'
  | 'newDevice';

// ------------------------------------------------------------------
// Email composition functions - one per type.
// They build the Email object only; delivery is handled by `deliver()`.
// ------------------------------------------------------------------

function composeConciergerieVerificationEmail(conciergerie: Conciergerie, userId: string): SendMailOptions {
  const verificationUrl = baseUrl + `/${userId}`;
  return {
    to: conciergerie.email,
    subject: 'Vérification de votre compte conciergerie',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Vérification de votre compte conciergerie</h2>
          <p>Bonjour ${conciergerie.name},</p>
          <p>Nous avons reçu une demande d'inscription pour votre conciergerie sur notre plateforme Job Conciergerie.</p>
          <p>Pour vérifier votre compte et accéder à votre espace, veuillez cliquer sur le lien ci-dessous :</p>
          <p>
            <a href="${verificationUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Vérifier mon compte
            </a>
          </p>
          <p>Ou copiez ce lien dans votre navigateur :</p>
          <p>${verificationUrl}</p>
          <p>Si vous n'avez pas demandé cette inscription, vous pouvez ignorer cet email.</p>
          <p>Merci,<br>L'équipe Job Conciergerie</p>
        </div>
      `,
  };
}

function composeEmployeeRegistrationEmail(conciergerie: Conciergerie, employee: Employee): SendMailOptions {
  return {
    to: conciergerie.email,
    subject: "Nouvelle demande d'inscription employé",
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Nouvelle demande d'inscription employé</h2>
          <p>Bonjour ${conciergerie.name},</p>
          <p>Un nouvel employé a demandé à rejoindre votre conciergerie sur notre plateforme Job Conciergerie.</p>
          <p><strong>Détails de l'employé :</strong></p>
          <ul>
            <li><strong>Nom :</strong> ${employee.firstName} ${employee.familyName}</li>
            <li><strong>Email :</strong> ${employee.email}</li>
            <li><strong>Téléphone :</strong> ${employee.tel}</li>
            <li><strong>Lieu de vie :</strong> ${employee.geographicZone}</li>
            ${employee.message && `<li><strong>Message :</strong> ${employee.message}</li>`}
          </ul>
          <p>Vous pouvez vous connecter à votre espace conciergerie pour accepter ou refuser cette demande.</p>
          <p>
            <a href="${baseUrl}/employees" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Voir mes prestataires
            </a>
          </p>
          <p>Merci,<br>L'équipe Job Conciergerie</p>
        </div>
      `,
  };
}

function composeNewDeviceNotificationEmail(employee: Employee, userId: string): SendMailOptions {
  return {
    to: employee.email,
    subject: 'Nouvel appareil connecté sur Job Conciergerie',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">Nouvel appareil détecté</h2>
          <p>Bonjour ${employee.firstName},</p>
          <p>Un nouvel appareil vient d&apos;être connecté à votre compte Job Conciergerie :</p>
          <div style="background-color: #fff8f8; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #d32f2f;">
            <p>Si vous êtes l&apos;auteur de cette connexion, veuillez cliquer sur le bouton ci-dessous :</p>
            <a href="${baseUrl}/${userId}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Valider cet appareil
            </a>
            <p>Si ce n&apos;est pas le cas, vous pouvez ignorer cet email.</p>
          </div>
          <p>Vous pouvez également consulter vos appareils connectés depuis les paramètres de votre compte, section "Appareils connectés".</p>
          <p>
            <a href="${baseUrl}/settings" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Voir mes appareils connectés
            </a>
          </p>
          <p style="margin-top: 30px; font-size: 14px; color: #718096;">
            Cordialement,<br>
            L&apos;équipe Job Conciergerie
          </p>
        </div>
      `,
  };
}

function composeEmployeeAcceptanceEmail(
  employee: Employee,
  conciergerie: Conciergerie,
  missionsCount: number,
  isAccepted: boolean,
): SendMailOptions {
  let title: string;
  let statusText: string;
  let extraHtml = '';

  // 3 valid transitions:
  // 1. isAccepted=true,  wasAccepted=false → new employee ACCEPTED
  // 2. isAccepted=false, wasAccepted=false → new employee REJECTED
  // 3. isAccepted=false, wasAccepted=true  → existing employee REMOVED
  const wasAccepted = employee.status === 'accepted';
  const status = isAccepted ? 'accepted' : wasAccepted ? 'removed' : 'rejected';
  switch (status) {
    case 'accepted': // Case 1 — New employee accepted
      title = 'Acceptation de votre inscription';
      statusText = 'retenue';
      extraHtml = `<p>Vous pouvez dès à présent vous connecter à l&apos;application</p>
        <p><a href="${baseUrl}" style="display:inline-block;background-color:#4F46E5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Accéder à l&apos;application</a></p>
        <p>Ou copiez ce lien dans votre navigateur :</p><p>${baseUrl}</p>`;
      break;
    case 'rejected': // Case 2 — New employee rejected
      title = 'Refus de votre inscription';
      statusText = 'refusée';
      extraHtml = `<p>Vous n&apos;aurez plus accès à l&apos;application.</p>
        <p>Nous vous remercions pour l&apos;intérêt que vous avez porté à notre service et vous souhaitons une bonne continuation.</p>`;
      break;
    case 'removed': // Case 3 — Existing employee removed
      title = 'Arrêt de votre inscription';
      statusText = 'arrêtée';
      extraHtml =
        (missionsCount > 0
          ? `<p>Vos ${missionsCount} mission${missionsCount > 1 ? 's' : ''} ont été annulée${missionsCount > 1 ? 's' : ''}, et vous n&apos;aurez plus accès à l&apos;application.</p>`
          : '') +
        `<p>Vous n&apos;aurez plus accès à l&apos;application.</p>
        <p>Nous vous remercions pour l&apos;intérêt que vous avez porté à notre service et vous souhaitons une bonne continuation.</p>`;
      break;
    default: // Invalid combo (should never happen in UI)
      title = 'Mise à jour de votre inscription';
      statusText = 'mise à jour';
      console.warn('Unexpected acceptance state: isAccepted=true & wasAccepted=true');
  }

  return {
    to: employee.email,
    replyTo: conciergerie.email,
    subject: title,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#333;">${title}</h2>
        <p>Bonjour ${employee.firstName},</p>
        <p>Nous vous informons que votre inscription a été ${statusText} par la conciergerie ${conciergerie.name}.</p>
        ${extraHtml}
        <p>Cordialement,<br>L&apos;équipe Job Conciergerie</p>
      </div>`,
  };
}

function composeMissionStatusChangeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
  status: MissionStatus,
): SendMailOptions {
  const startDate = formatDateTime(mission.startDateTime);
  const endDate = formatDateTime(mission.endDateTime);

  let statusMessage = '';
  let statusAction = '';
  switch (status) {
    case 'accepted':
      statusMessage = 'a été acceptée';
      statusAction = 'accepté';
      break;
    case 'started':
      statusMessage = 'a été démarrée';
      statusAction = 'démarré';
      break;
    case 'completed':
      statusMessage = 'a été terminée';
      statusAction = 'terminé';
      break;
  }

  return {
    to: conciergerie.email,
    subject: `Mission ${statusAction}e - ${home.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Statut de mission mis à jour</h2>
        <p>Bonjour ${conciergerie.name},</p>
        <p>Une mission pour <strong>${home.title}</strong> ${statusMessage} par ${employee.firstName} ${employee.familyName}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #4F46E5;">Détails de la mission</h3>
          <p><strong>Bien:</strong> ${home.title}</p>
          <p><strong>Date de début:</strong> ${startDate}</p>
          <p><strong>Date de fin:</strong> ${endDate}</p>
          <p><strong>Tâches:</strong> ${mission.tasks.join(', ')}</p>
          <p><strong>Employé:</strong> ${employee.firstName} ${employee.familyName}</p>
          <p><strong>Statut:</strong> ${employee.firstName} a ${statusAction} cette mission</p>
        </div>
        <p>Vous pouvez consulter les détails complets de cette mission dans votre espace conciergerie.</p>
        <p>
          <a href="${baseUrl}/missions" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Voir mes missions
          </a>
        </p>
        <p>Cordialement,<br>L&apos;équipe Job Conciergerie</p>
      </div>
    `,
  };
}

function composeLateCompletionEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
): SendMailOptions {
  const startDate = formatDateTime(mission.startDateTime);
  const endDate = formatDateTime(mission.endDateTime);

  const statusLabel = {
    accepted: 'acceptée mais non démarrée',
    started: 'démarrée mais non terminée',
    completed: 'terminée',
  }[mission.status || 'accepted'];

  const now = new Date();
  const endDateTime = new Date(mission.endDateTime);
  const daysLate = Math.floor((now.getTime() - endDateTime.getTime()) / (1000 * 60 * 60 * 24));
  const daysLateText = daysLate === 0 ? "aujourd'hui" : daysLate === 1 ? 'hier' : `il y a ${daysLate} jours`;

  return {
    to: conciergerie.email,
    cc: employee.email,
    subject: `⚠️ Mission non terminée à temps - ${home.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Mission non terminée à temps</h2>
        <p>Bonjour,</p>
        <p>Une mission pour <strong>${home.title}</strong> n'a pas été terminée à temps. La date de fin était prévue pour ${endDate} (${daysLateText}).</p>
        <div style="background-color: #fff8f8; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #d32f2f;">
          <h3 style="margin-top: 0; color: #d32f2f;">Détails de la mission</h3>
          <p><strong>Bien:</strong> ${home.title}</p>
          <p><strong>Date de début:</strong> ${startDate}</p>
          <p><strong>Date de fin:</strong> ${endDate}</p>
          <p><strong>Tâches:</strong> ${mission.tasks.join(', ')}</p>
          <p><strong>Employé:</strong> ${employee.firstName} ${employee.familyName}</p>
          <p><strong>Statut actuel:</strong> ${statusLabel}</p>
        </div>
        <p>Vous pouvez vérifier l'état de cette mission via votre espace conciergerie.</p>
        <p>
          <a href="${baseUrl}/calendar" style="display: inline-block; background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Voir mes missions
          </a>
        </p>
        <p>Cordialement,<br>L&apos;équipe Job Conciergerie</p>
      </div>
    `,
  };
}

function composeMissionAcceptanceToEmployeeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
): SendMailOptions {
  const startDate = formatDateTime(mission.startDateTime);
  const endDate = formatDateTime(mission.endDateTime);
  const hours = mission.hours === 1 ? '1 heure' : `${mission.hours} heures`;

  return {
    to: employee.email,
    replyTo: conciergerie.email,
    subject: `🔔 Confirmation de mission - ${home.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Confirmation de mission</h2>
        <p>Bonjour ${employee.firstName},</p>
        <p>Vous avez accepté une mission pour <strong>${home.title}</strong>. Voici un récapitulatif des détails :</p>
        <div style="background-color: #f5f7ff; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #4F46E5;">
          <h3 style="margin-top: 0; color: #4F46E5;">Récapitulatif de la mission</h3>
          <p><strong>Bien:</strong> ${home.title}</p>
          <p><strong>Conciergerie:</strong> ${conciergerie.name}</p>
          <p><strong>Date de début:</strong> ${startDate}</p>
          <p><strong>Date de fin:</strong> ${endDate}</p>
          <p><strong>Durée estimée:</strong> ${hours}</p>
          <p><strong>Tâches:</strong> ${mission.tasks.join(', ')}</p>
        </div>
        <p><strong>Rappel important:</strong></p>
        <ul>
          <li>N'oubliez pas de démarrer la mission dans l'application dès que vous commencez votre travail.</li>
          <li>Quand vous avez terminé les tâches, marquez la mission comme complétée dans l'application.</li>
          <li>Si vous rencontrez des difficultés, contactez directement la conciergerie.</li>
        </ul>
        <p>Vous pouvez consulter et gérer cette mission à tout moment via l'application :</p>
        <p>
          <a href="${baseUrl}/calendar" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Gérer mes missions
          </a>
        </p>
        <p>Merci de votre engagement et bon travail !</p>
        <p>Cordialement,<br>L&apos;équipe Job Conciergerie</p>
      </div>
    `,
  };
}

function composeMissionUpdatedToEmployeeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
  changes: string[],
): SendMailOptions {
  const startDate = formatDateTime(mission.startDateTime);
  const endDate = formatDateTime(mission.endDateTime);
  const hours = mission.hours === 1 ? '1 heure' : `${mission.hours} heures`;

  return {
    to: employee.email,
    replyTo: conciergerie.email,
    subject: `🔄 Mise à jour de mission - ${home.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d97706;">Mise à jour de mission</h2>
        <p>Bonjour ${employee.firstName},</p>
        <p>Une mission que vous avez acceptée pour <strong>${home.title}</strong> a été modifiée par la conciergerie ${conciergerie.name}.</p>
        <div style="background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #d97706;">
          <h3 style="margin-top: 0; color: #d97706;">Modifications apportées</h3>
          <ul>
            ${changes.map(change => `<li>${change}</li>`).join('')}
          </ul>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #4b5563;">Détails mis à jour de la mission</h3>
          <p><strong>Bien:</strong> ${home.title}</p>
          <p><strong>Conciergerie:</strong> ${conciergerie.name}</p>
          <p><strong>Date de début:</strong> ${startDate}</p>
          <p><strong>Date de fin:</strong> ${endDate}</p>
          <p><strong>Durée estimée:</strong> ${hours}</p>
          <p><strong>Tâches:</strong> ${mission.tasks.join(', ')}</p>
        </div>
        <p><strong>Important :</strong> Suite à ces modifications, votre assignation à cette mission a été annulée.</p>
        <p>Si vous êtes toujours intéressé(e) par cette mission avec les changements mentionnés ci-dessus, vous devrez l'accepter à nouveau dans l'application.</p>
        <p>Vous pouvez consulter les détails complets de la mission via l'application :</p>
        <p>
          <a href="${baseUrl}/missions" style="display: inline-block; background-color: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Voir les missions
          </a>
        </p>
        <p>Cordialement,<br>L&apos;équipe Job Conciergerie</p>
      </div>
    `,
  };
}

function composeMissionRemovedToEmployeeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
  type: 'deleted' | 'canceled',
): SendMailOptions {
  const startDate = formatDateTime(mission.startDateTime);
  const endDate = formatDateTime(mission.endDateTime);

  const config = {
    deleted: {
      emoji: '❌',
      title: 'Mission supprimée',
      color: '#dc2626',
      bgColor: '#fef2f2',
      action: 'supprimée',
      actionNoun: 'suppression',
    },
    canceled: {
      emoji: '⛔',
      title: 'Mission annulée',
      color: '#7c3aed',
      bgColor: '#f5f3ff',
      action: 'annulée',
      actionNoun: 'annulation',
    },
  }[type];

  return {
    to: employee.email,
    replyTo: conciergerie.email,
    subject: `${config.emoji} ${config.title} - ${home.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${config.color};">${config.title}</h2>
        <p>Bonjour ${employee.firstName},</p>
        <p>Nous vous informons que la mission pour <strong>${home.title}</strong> a été ${config.action} par la conciergerie ${conciergerie.name}.</p>
        <div style="background-color: ${config.bgColor}; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid ${config.color};">
          <h3 style="margin-top: 0; color: ${config.color};">Détails de la mission ${config.action}</h3>
          <p><strong>Bien:</strong> ${home.title}</p>
          <p><strong>Conciergerie:</strong> ${conciergerie.name}</p>
          <p><strong>Date de début:</strong> ${startDate}</p>
          <p><strong>Date de fin:</strong> ${endDate}</p>
          <p><strong>Tâches:</strong> ${mission.tasks.join(', ')}</p>
        </div>
        <p>Pour toute question concernant cette ${config.actionNoun}, veuillez contacter directement la conciergerie.</p>
        <p>Vous pouvez consulter vos autres missions via l'application :</p>
        <p>
          <a href="${baseUrl}/calendar" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Voir mes missions
          </a>
        </p>
        <p>Cordialement,<br>L&apos;équipe Job Conciergerie</p>
      </div>
    `,
  };
}

// ------------------------------------------------------------------
// Public server actions
// Each attempts the SMTP send; on failure the email is queued in the DB
// and the cron job will pick it up for retries.
// ------------------------------------------------------------------

export async function sendConciergerieVerificationEmail(
  conciergerie: Conciergerie,
  userId: string,
  isRetry = false,
): Promise<boolean> {
  return deliver(
    composeConciergerieVerificationEmail(conciergerie, userId),
    'verification',
    { conciergerie, userId },
    isRetry,
  );
}

export async function sendEmployeeRegistrationEmail(
  conciergerie: Conciergerie,
  employee: Employee,
  isRetry = false,
): Promise<boolean> {
  return deliver(
    composeEmployeeRegistrationEmail(conciergerie, employee),
    'registration',
    { conciergerie, employee },
    isRetry,
  );
}

export async function sendNewDeviceNotificationEmail(
  employee: Employee,
  userId: string,
  isRetry = false,
): Promise<boolean> {
  return deliver(composeNewDeviceNotificationEmail(employee, userId), 'newDevice', { employee, userId }, isRetry);
}

export async function sendEmployeeAcceptanceEmail(
  employee: Employee,
  conciergerie: Conciergerie,
  missionsCount: number,
  isAccepted: boolean,
  isRetry = false,
): Promise<boolean> {
  return deliver(
    composeEmployeeAcceptanceEmail(employee, conciergerie, missionsCount, isAccepted),
    'acceptance',
    { employee, conciergerie, missionsCount, isAccepted },
    isRetry,
  );
}

export async function sendMissionStatusChangeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
  status: MissionStatus,
  isRetry = false,
): Promise<boolean> {
  return deliver(
    composeMissionStatusChangeEmail(mission, home, employee, conciergerie, status),
    'missionStatus',
    { mission, home, employee, conciergerie, status },
    isRetry,
  );
}

export async function sendLateCompletionEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
  isRetry = false,
): Promise<boolean> {
  return deliver(
    composeLateCompletionEmail(mission, home, employee, conciergerie),
    'lateCompletion',
    { mission, home, employee, conciergerie },
    isRetry,
  );
}

export async function sendMissionAcceptanceToEmployeeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
  isRetry = false,
): Promise<boolean> {
  return deliver(
    composeMissionAcceptanceToEmployeeEmail(mission, home, employee, conciergerie),
    'missionAcceptance',
    { mission, home, employee, conciergerie },
    isRetry,
  );
}

export async function sendMissionUpdatedToEmployeeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
  changes: string[],
  isRetry = false,
): Promise<boolean> {
  return deliver(
    composeMissionUpdatedToEmployeeEmail(mission, home, employee, conciergerie, changes),
    'missionUpdated',
    { mission, home, employee, conciergerie, changes },
    isRetry,
  );
}

export async function sendMissionRemovedToEmployeeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
  type: 'deleted' | 'canceled',
  isRetry = false,
): Promise<boolean> {
  return deliver(
    composeMissionRemovedToEmployeeEmail(mission, home, employee, conciergerie, type),
    'missionRemoved',
    { mission, home, employee, conciergerie, type },
    isRetry,
  );
}

/**
 * Admin alert sent when an email is permanently given up on after exhausting all retries.
 * Not queued on failure - if this one fails, we only log.
 */
export async function sendAdminAlertEmail(
  queuedEmailType: string,
  payload: Record<string, unknown>,
  attempts: number,
  lastError: string | null,
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'contact@job-conciergerie.fr';
  const { success } = await sendEmail({
    to: adminEmail,
    subject: `🚨 Email abandonné après ${attempts} tentatives - ${queuedEmailType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Email abandonné</h2>
        <p>Un email n'a pas pu être envoyé après ${attempts} tentatives et a été retiré de la file d'attente.</p>
        <ul>
          <li><strong>Type :</strong> ${queuedEmailType}</li>
          <li><strong>Tentatives :</strong> ${attempts}</li>
          <li><strong>Dernière erreur :</strong> ${lastError ?? 'n/a'}</li>
        </ul>
        <p><strong>Payload :</strong></p>
        <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto;">${JSON.stringify(
          payload,
          null,
          2,
        )
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>
        <p style="color: #6b7280; font-size: 12px;">Job Conciergerie - système de retry</p>
      </div>
    `,
  });
  return success;
}

/**
 * Internal retry helper used by the /api/retry-emails endpoint.
 * Re-dispatches a queued email by its type and payload, WITHOUT re-queuing on failure.
 */
export async function retryQueuedEmail(type: FailedEmailType, payload: Record<string, unknown>): Promise<boolean> {
  switch (type) {
    case 'verification':
      return sendConciergerieVerificationEmail(payload.conciergerie as Conciergerie, payload.userId as string, true);
    case 'registration':
      return sendEmployeeRegistrationEmail(payload.conciergerie as Conciergerie, payload.employee as Employee, true);
    case 'newDevice':
      return sendNewDeviceNotificationEmail(payload.employee as Employee, payload.userId as string, true);
    case 'acceptance':
      return sendEmployeeAcceptanceEmail(
        payload.employee as Employee,
        payload.conciergerie as Conciergerie,
        payload.missionsCount as number,
        payload.isAccepted as boolean,
        true,
      );
    case 'missionStatus':
      return sendMissionStatusChangeEmail(
        payload.mission as Mission,
        payload.home as Home,
        payload.employee as Employee,
        payload.conciergerie as Conciergerie,
        payload.status as MissionStatus,
        true,
      );
    case 'lateCompletion':
      return sendLateCompletionEmail(
        payload.mission as Mission,
        payload.home as Home,
        payload.employee as Employee,
        payload.conciergerie as Conciergerie,
        true,
      );
    case 'missionAcceptance':
      return sendMissionAcceptanceToEmployeeEmail(
        payload.mission as Mission,
        payload.home as Home,
        payload.employee as Employee,
        payload.conciergerie as Conciergerie,
        true,
      );
    case 'missionUpdated':
      return sendMissionUpdatedToEmployeeEmail(
        payload.mission as Mission,
        payload.home as Home,
        payload.employee as Employee,
        payload.conciergerie as Conciergerie,
        payload.changes as string[],
        true,
      );
    case 'missionRemoved':
      return sendMissionRemovedToEmployeeEmail(
        payload.mission as Mission,
        payload.home as Home,
        payload.employee as Employee,
        payload.conciergerie as Conciergerie,
        payload.type as 'deleted' | 'canceled',
        true,
      );
    default:
      console.error(`Unknown email type for retry: ${type}`);
      return false;
  }
}
