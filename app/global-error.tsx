'use client'; // Error components must be Client Components

// global-error replaces the root layout — with route groups there is no shared
// one, so it must render its own <html>/<body> and import its own styles.
import './(app)/globals.css';
import Error500 from '@/app/components/error500';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body>
        <Error500 error={error} reset={reset} />
      </body>
    </html>
  );
}
