import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import NavigationLayout from './components/layouts/navigationLayout';
import { MenuProvider } from './contexts/menuProvider';
import { MissionsProvider } from './contexts/missionsProvider';
import { ThemeProvider } from './contexts/themeProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <MenuProvider>
            <MissionsProvider>
              <NavigationLayout>{children}</NavigationLayout>
            </MissionsProvider>
          </MenuProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
