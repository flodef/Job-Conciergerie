'use server';

import nodemailer from 'nodemailer';
import { getClientIp, isFormTokenValid, isIpBlocked, isRateLimited, issueFormToken } from './antiSpam';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function getContactToken(): Promise<string> {
  return issueFormToken();
}

export async function sendContactEmail(params: {
  name: string;
  company: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  website?: string;
  token?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { name, company, email, phone, subject, message, website, token } = params;

  // Honeypot: pretend success so bots don't retry, but send nothing.
  if (website) return { success: true };

  const ip = await getClientIp();
  if (isIpBlocked(ip) || isRateLimited(ip, 'contact') || !isFormTokenValid(token)) {
    return { success: false, error: 'rejected' };
  }

  const subjectLabels: Record<string, string> = {
    'forfait-decouverte': 'Forfait Découverte',
    'forfait-pro': 'Forfait Pro',
    'forfait-privilege': 'Forfait Privilège',
    'demande-renseignement': 'Demande de renseignement',
    demo: 'Demande de démo',
  };

  const subjectLabel = subjectLabels[subject] || subject;

  const body = `
Nouveau message depuis le site Job Conciergerie

Nom: ${name}
Entreprise: ${company || 'N/A'}
Email: ${email}
Téléphone: ${phone || 'N/A'}
Sujet: ${subjectLabel}

Message:
${message}
`.trim();

  try {
    await transporter.sendMail({
      from: `"Job Conciergerie" <${process.env.SMTP_FROM_EMAIL}>`,
      to: 'contact@job-conciergerie.fr',
      replyTo: email,
      subject: `[Site] ${subjectLabel} — ${name}`,
      text: body,
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending contact email:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
