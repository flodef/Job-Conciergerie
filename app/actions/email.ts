'use server';

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

export async function sendEmail(email: Email): Promise<boolean> {
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

/**
 * Send a verification email to a conciergerie
 */
export async function sendConciergerieVerificationEmail(
  emailAddress: string,
  name: string,
  userId: string,
  baseUrl: string,
): Promise<boolean> {
  const verificationUrl = (baseUrl.includes('localhost') ? baseUrl : 'https://job-conciergerie.fr') + `/${userId}`;

  return await sendEmail({
    to: emailAddress,
    subject: 'Vérification de votre compte conciergerie',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Vérification de votre compte conciergerie</h2>
          <p>Bonjour ${name},</p>
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
export async function sendEmployeeRegistrationEmail(
  conciergerieEmail: string,
  conciergieName: string,
  employeeName: string,
  employeeEmail: string,
  employeePhone: string,
  employeeZone: string,
  employeeMessage: string | undefined,
): Promise<boolean> {
  return await sendEmail({
    to: conciergerieEmail,
    subject: "Nouvelle demande d'inscription employé",
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Nouvelle demande d'inscription employé</h2>
          <p>Bonjour ${conciergieName},</p>
          <p>Un nouvel employé a demandé à rejoindre votre conciergerie sur notre plateforme Job Conciergerie.</p>
          <p><strong>Détails de l'employé :</strong></p>
          <ul>
            <li><strong>Nom :</strong> ${employeeName}</li>
            <li><strong>Email :</strong> ${employeeEmail}</li>
            <li><strong>Téléphone :</strong> ${employeePhone}</li>
            <li><strong>Lieu de vie :</strong> ${employeeZone}</li>
            ${employeeMessage && `<li><strong>Message :</strong> ${employeeMessage}</li>`}
          </ul>
          <p>Vous pouvez vous connecter à votre espace conciergerie pour accepter ou refuser cette demande.</p>
          <p>Merci,<br>L'équipe Job Conciergerie</p>
        </div>
      `,
  });
}
