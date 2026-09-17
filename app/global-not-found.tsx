import type { Metadata } from 'next';
import Link from 'next/link';
import './(app)/globals.css';

// Route groups mean there is no single root layout — this page is returned
// directly by the router for unmatched URLs, so it must be self-contained
// (own <html>, own styles). Requires experimental.globalNotFound in next.config.
export const metadata: Metadata = {
  title: 'Page introuvable — Job Conciergerie',
};

export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body>
        <main className="min-h-screen flex flex-col items-center justify-center gap-6 font-sans">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-lg">Cette page n&apos;existe pas.</p>
          <Link href="/" className="underline">
            Retour à l&apos;accueil
          </Link>
        </main>
      </body>
    </html>
  );
}
