import type { Metadata } from 'next';
import localFont from 'next/font/local';
import NavigationLayout from './components/navigationLayout';
import { HomesProvider } from './contexts/homesProvider';
import { MenuProvider } from './contexts/menuProvider';
import { MissionsProviderWrapper } from './contexts/missionsProvider';
import { ThemeProvider } from './contexts/themeProvider';
import './globals.css';

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <MenuProvider>
            <HomesProvider>
              <MissionsProviderWrapper>
                <NavigationLayout>{children}</NavigationLayout>
              </MissionsProviderWrapper>
            </HomesProvider>
          </MenuProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
