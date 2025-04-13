import NavigationLayout from '@/app/components/navigationLayout';
import { AuthProvider } from '@/app/contexts/authProvider';
import { BadgeProvider } from '@/app/contexts/badgeProvider';
import { FetchTimeProvider } from '@/app/contexts/fetchTimeProvider';
import { HomesProvider } from '@/app/contexts/homesProvider';
import { MenuProvider } from '@/app/contexts/menuProvider';
import { MissionsProviderWrapper } from '@/app/contexts/missionsProvider';
import '@/app/globals.css';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Job Conciergerie',
  description: 'Gestion des missions pour conciergeries et employés',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Job Conciergerie',
  },
};

export const viewport: Viewport = {
  themeColor: '#a4bcde',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#a4bcde" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen`}>
        <span style={{ display: 'none', fontFamily: 'var(--font-geist-sans)' }}>Force font load</span>
        <MenuProvider>
          <AuthProvider>
            <HomesProvider>
              <MissionsProviderWrapper>
                <FetchTimeProvider>
                  <BadgeProvider>
                    <NavigationLayout>{children}</NavigationLayout>
                  </BadgeProvider>
                </FetchTimeProvider>
              </MissionsProviderWrapper>
            </HomesProvider>
          </AuthProvider>
        </MenuProvider>
      </body>
    </html>
  );
}
