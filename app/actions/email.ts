'use server';

import { Conciergerie, Employee, Home, Mission } from '@/app/types/dataTypes';
import { formatDateTime } from '@/app/utils/date';
import nodemailer from 'nodemailer';

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

interface Email {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(email: Email): Promise<boolean> {
  try {
    await transporter.sendMail({
      ...email,
      from: `"Job Conciergerie" <${process.env.SMTP_FROM_EMAIL}>`,
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Send a verification email to a conciergerie
 */
export async function sendConciergerieVerificationEmail(conciergerie: Conciergerie, userId: string): Promise<boolean> {
  const verificationUrl = baseUrl + `/${userId}`;

  return await sendEmail({
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
  });
}

/**
 * Send a notification email to a conciergerie about a new employee registration
 */
export async function sendEmployeeRegistrationEmail(conciergerie: Conciergerie, employee: Employee): Promise<boolean> {
  return await sendEmail({
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
          <p>Merci,<br>L'équipe Job Conciergerie</p>
        </div>
      `,
  });
}

/**
 * Send an acceptance notification email to an employee whether it's status is approved or rejected
 */
export async function sendEmployeeAcceptanceEmail(
  employee: Employee,
  conciergerieName: string,
  missionsCount: number,
  isAccepted: boolean,
): Promise<boolean> {
  const wasAccepted = employee.status === 'accepted';
  return await sendEmail({
    to: employee.email,
    subject: 'Information concernant votre inscription à Job Conciergerie',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${
            isAccepted ? 'Acceptation' : wasAccepted ? 'Arrêt' : 'Refus'
          } de votre inscription</h2>
          <p>Bonjour ${employee.firstName} ${employee.familyName},</p>
          <p>Nous vous informons que votre inscription a été ${
            isAccepted ? 'retenue' : wasAccepted ? 'arrêtée' : 'refusée'
          } par la conciergerie ${conciergerieName}.</p>
          ${
            missionsCount > 0
              ? `<p>Vos ${missionsCount} mission${missionsCount > 1 ? 's' : ''} ont été annulée${
                  missionsCount > 1 ? 's' : ''
                }, et vous n&apos;aurez plus accès à l&apos;application.</p>`
              : `<p>Vous n&apos;aurez plus accès à l&apos;application.</p>`
          }
          ${
            isAccepted
              ? `<p>Vous pouvez dès à présent vous connecter à l&apos;application</p>
              <p>
                <a href="${baseUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                  Accéder à l&apos;application
                </a>
              </p>
              <p>Ou copiez ce lien dans votre navigateur :</p>
              <p>${baseUrl}</p>`
              : `<p>Nous vous remercions pour l&apos;intérêt que vous avez porté à notre service et vous souhaitons une bonne continuation.</p>`
          }
          <p>Cordialement,<br>L&apos;équipe Job Conciergerie</p>
        </div>
      `,
  });
}

/**
 * Send notification email to a conciergerie about a mission status change
 */
export async function sendMissionStatusChangeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
  status: 'accepted' | 'started' | 'completed',
): Promise<boolean> {
  // Format dates
  const startDate = formatDateTime(mission.startDateTime);
  const endDate = formatDateTime(mission.endDateTime);

  // Determine status message
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

  // Generate email content
  return await sendEmail({
    to: conciergerie.email,
    subject: `Mission ${statusAction}e - ${home.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Statut de mission mis à jour</h2>
        <p>Bonjour ${conciergerie.name},</p>
        <p>Une mission pour <strong>${home.title}</strong> ${statusMessage} par ${employee.firstName} ${
      employee.familyName
    }.</p>
        
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
  });
}

/**
 * Send notification for missions that haven't been completed on time
 */
export async function sendLateCompletionEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerie: Conciergerie,
): Promise<boolean> {
  // Format dates
  const startDate = formatDateTime(mission.startDateTime);
  const endDate = formatDateTime(mission.endDateTime);

  // Get current mission status label
  const statusLabel = {
    accepted: 'acceptée mais non démarrée',
    started: 'démarrée mais non terminée',
    completed: 'terminée',
  }[mission.status || 'accepted'];

  // Calculate how many days late
  const now = new Date();
  const endDateTime = new Date(mission.endDateTime);
  const daysLate = Math.floor((now.getTime() - endDateTime.getTime()) / (1000 * 60 * 60 * 24));
  const daysLateText = daysLate === 0 ? "aujourd'hui" : daysLate === 1 ? 'hier' : `il y a ${daysLate} jours`;

  // Generate email content
  return await sendEmail({
    to: conciergerie.email,
    subject: `⚠️ Mission non terminée à temps - ${home.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Mission non terminée à temps</h2>
        <p>Bonjour ${conciergerie.name},</p>
        <p>Une mission pour <strong>${
          home.title
        }</strong> n'a pas été terminée à temps. La date de fin était prévue pour ${endDate} (${daysLateText}).</p>
        
        <div style="background-color: #fff8f8; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #d32f2f;">
          <h3 style="margin-top: 0; color: #d32f2f;">Détails de la mission</h3>
          <p><strong>Bien:</strong> ${home.title}</p>
          <p><strong>Date de début:</strong> ${startDate}</p>
          <p><strong>Date de fin:</strong> ${endDate}</p>
          <p><strong>Tâches:</strong> ${mission.tasks.join(', ')}</p>
          <p><strong>Employé:</strong> ${employee.firstName} ${employee.familyName}</p>
          <p><strong>Statut actuel:</strong> ${statusLabel}</p>
        </div>
        
        <p>Vous pouvez vérifier l'état de cette mission ou contacter l'employé via votre espace conciergerie.</p>
        <p>
          <a href="${baseUrl}/calendar" style="display: inline-block; background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Voir mes missions
          </a>
        </p>
        
        <p>Cordialement,<br>L&apos;équipe Job Conciergerie</p>
      </div>
    `,
  });
}

/**
 * Send a confirmation email to an employee when they accept a mission
 */
export async function sendMissionAcceptanceToEmployeeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerieName: string,
): Promise<boolean> {
  // Format dates
  const startDate = formatDateTime(mission.startDateTime);
  const endDate = formatDateTime(mission.endDateTime);

  // Calculate mission duration in hours and display it in a human-readable format
  const hours = mission.hours === 1 ? '1 heure' : `${mission.hours} heures`;

  // Generate email content
  return await sendEmail({
    to: employee.email,
    subject: `🔔 Confirmation de mission - ${home.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Confirmation de mission</h2>
        <p>Bonjour ${employee.firstName},</p>
        <p>Vous avez accepté une mission pour <strong>${home.title}</strong>. Voici un récapitulatif des détails :</p>
        
        <div style="background-color: #f5f7ff; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #4F46E5;">
          <h3 style="margin-top: 0; color: #4F46E5;">Récapitulatif de la mission</h3>
          <p><strong>Bien:</strong> ${home.title}</p>
          <p><strong>Conciergerie:</strong> ${conciergerieName}</p>
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
  });
}

/**
 * Send an email to an employee when a mission has been updated
 */
export async function sendMissionUpdatedToEmployeeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerieName: string,
  changes: string[],
): Promise<boolean> {
  // Format dates
  const startDate = formatDateTime(mission.startDateTime);
  const endDate = formatDateTime(mission.endDateTime);

  // Calculate mission duration in hours
  const hours = mission.hours === 1 ? '1 heure' : `${mission.hours} heures`;

  // Generate email content
  return await sendEmail({
    to: employee.email,
    subject: `🔄 Mise à jour de mission - ${home.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d97706;">Mise à jour de mission</h2>
        <p>Bonjour ${employee.firstName},</p>
        <p>Une mission que vous avez acceptée pour <strong>${
          home.title
        }</strong> a été modifiée par la conciergerie ${conciergerieName}.</p>
        
        <div style="background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #d97706;">
          <h3 style="margin-top: 0; color: #d97706;">Modifications apportées</h3>
          <ul>
            ${changes.map(change => `<li>${change}</li>`).join('')}
          </ul>
        </div>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #4b5563;">Détails mis à jour de la mission</h3>
          <p><strong>Bien:</strong> ${home.title}</p>
          <p><strong>Conciergerie:</strong> ${conciergerieName}</p>
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
  });
}

/**
 * Send an email to an employee when a mission has been either deleted or canceled
 */
export async function sendMissionRemovedToEmployeeEmail(
  mission: Mission,
  home: Home,
  employee: Employee,
  conciergerieName: string,
  type: 'deleted' | 'canceled',
): Promise<boolean> {
  // Format dates
  const startDate = formatDateTime(mission.startDateTime);
  const endDate = formatDateTime(mission.endDateTime);

  // Determine styling and text based on removal type
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

  // Generate email content
  return await sendEmail({
    to: employee.email,
    subject: `${config.emoji} ${config.title} - ${home.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${config.color};">${config.title}</h2>
        <p>Bonjour ${employee.firstName},</p>
        <p>Nous vous informons que la mission pour <strong>${home.title}</strong> a été ${
      config.action
    } par la conciergerie ${conciergerieName}.</p>
        
        <div style="background-color: ${
          config.bgColor
        }; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid ${config.color};">
          <h3 style="margin-top: 0; color: ${config.color};">Détails de la mission ${config.action}</h3>
          <p><strong>Bien:</strong> ${home.title}</p>
          <p><strong>Conciergerie:</strong> ${conciergerieName}</p>
          <p><strong>Date de début:</strong> ${startDate}</p>
          <p><strong>Date de fin:</strong> ${endDate}</p>
          <p><strong>Tâches:</strong> ${mission.tasks.join(', ')}</p>
        </div>
        
        <p>Pour toute question concernant cette ${
          config.actionNoun
        }, veuillez contacter directement la conciergerie.</p>
        
        <p>Vous pouvez consulter vos autres missions via l'application :</p>
        <p>
          <a href="${baseUrl}/calendar" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Voir mes missions
          </a>
        </p>
        
        <p>Cordialement,<br>L&apos;équipe Job Conciergerie</p>
      </div>
    `,
  });
}
