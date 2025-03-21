// app/actions/sendEmail.js
'use server';

import nodemailer from 'nodemailer';

const to = 'flo@fims.fi'; // TODO: remove when in prod

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

/**
 * Load email
 */
export async function loadEmail() {
  return;
}

/**
 * Send a verification email to a conciergerie
 */
export async function sendConciergerieVerificationEmail(
  email: string,
  name: string,
  userId: string,
): Promise<{ success: boolean; error?: unknown }> {
  try {
    // Create the verification URL
    const baseUrl =
      process.env.NODE_ENV === 'production'
        ? 'https://job-conciergerie.vercel.app' // TODO: Replace with your production URL
        : 'http://localhost:3000';

    const verificationUrl = `${baseUrl}/${userId}`;

    // Send the email
    await transporter.sendMail({
      from: `"Job Conciergerie" <${process.env.SMTP_FROM_EMAIL}>`,
      to: to || email,
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

    return { success: true };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error };
  }
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
): Promise<{ success: boolean; error?: unknown }> {
  try {
    // Send the email
    await transporter.sendMail({
      from: `"Job Conciergerie" <${process.env.SMTP_FROM_EMAIL}>`,
      to: to || conciergerieEmail,
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
          </ul>
          <p>Vous pouvez vous connecter à votre espace conciergerie pour accepter ou refuser cette demande.</p>
          <p>Merci,<br>L'équipe Job Conciergerie</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending employee registration email:', error);
    return { success: false, error };
  }
}
