import NavigationLayout from '@/app/components/navigationLayout';
import { AuthProvider } from '@/app/contexts/authProvider';
import { BadgeProvider } from '@/app/contexts/badgeProvider';
import { HomesProvider } from '@/app/contexts/homesProvider';
import { MenuProvider } from '@/app/contexts/menuProvider';
import { MissionsProviderWrapper } from '@/app/contexts/missionsProvider';
import '@/app/globals.css';
import type { Metadata } from 'next';
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
  description: 'Postez votre annonce de maniere simple',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen`}>
        <MenuProvider>
          <AuthProvider>
            <HomesProvider>
              <MissionsProviderWrapper>
                <BadgeProvider>
                  <NavigationLayout>{children}</NavigationLayout>
                </BadgeProvider>
              </MissionsProviderWrapper>
            </HomesProvider>
          </AuthProvider>
        </MenuProvider>
      </body>
    </html>
  );
}
