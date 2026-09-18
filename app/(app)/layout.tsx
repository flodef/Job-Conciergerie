import { MaintenanceCheck } from '@/app/components/maintenanceMode';
import NavigationLayout from '@/app/components/navigationLayout';
import { OfflineIndicator } from '@/app/components/offlineIndicator';
import { ProdSafetyCheck } from '@/app/components/prodSafetyCheck';
import { ServiceWorkerRegister } from '@/app/components/serviceWorkerRegister';
import { AuthProvider } from '@/app/contexts/authProvider';
import { BadgeProvider } from '@/app/contexts/badgeProvider';
import { HomesProvider } from '@/app/contexts/homesProvider';
import { MenuProvider } from '@/app/contexts/menuProvider';
import { MissionsProviderWrapper } from '@/app/contexts/missionsProvider';
import { ModalProvider } from '@/app/contexts/modalProvider';
import { ToastProvider } from '@/app/contexts/toastProvider';
import './globals.css';
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
  description: 'Gestion des missions pour conciergeries et prestataires',
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

// Restores the stored theme before first paint — sets data-theme (the user's
// choice: system/light/dark) plus the resolved .dark/.light class, so CSS and
// the toggle's active state are correct with no flash.
const themeInitScript = `(function(){try{var m=localStorage.getItem('theme');if(m!=='light'&&m!=='dark')m='system';var r=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;var d=document.documentElement;d.dataset.theme=m;d.classList.toggle('dark',r==='dark');d.classList.toggle('light',r==='light');d.style.colorScheme=r;}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#a4bcde" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-dvh`}>
        <ProdSafetyCheck>
          <MaintenanceCheck>
            <span style={{ display: 'none', fontFamily: 'var(--font-geist-sans)' }}>Force font load</span>
            <ServiceWorkerRegister />
            <MenuProvider>
              <AuthProvider>
                <HomesProvider>
                  <MissionsProviderWrapper>
                    <BadgeProvider>
                      <ToastProvider>
                        <ModalProvider>
                          <NavigationLayout>{children}</NavigationLayout>
                          <OfflineIndicator />
                        </ModalProvider>
                      </ToastProvider>
                    </BadgeProvider>
                  </MissionsProviderWrapper>
                </HomesProvider>
              </AuthProvider>
            </MenuProvider>
          </MaintenanceCheck>
        </ProdSafetyCheck>
      </body>
    </html>
  );
}
