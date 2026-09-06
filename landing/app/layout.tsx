import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Job Conciergerie — La plateforme qui connecte conciergeries et prestataires',
  description: 'Gérez vos missions de conciergerie en toute simplicité. Attribution automatique, suivi en temps réel, comptes rendus photo, et bien plus.',
  keywords: ['conciergerie', 'gestion mission', 'prestataire', 'application', 'plateforme'],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
