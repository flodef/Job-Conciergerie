'use server';

import { Conciergerie, Employee, Home, Mission } from '@/app/types/dataTypes';
import { formatDate, formatTime } from '@/app/utils/date';
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
  const startDate = formatDate(mission.startDateTime);
  const startTime = formatTime(mission.startDateTime);
  const endDate = formatDate(mission.endDateTime);
  const endTime = formatTime(mission.endDateTime);

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
          <p><strong>Date de début:</strong> ${startDate} à ${startTime}</p>
          <p><strong>Date de fin:</strong> ${endDate} à ${endTime}</p>
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
