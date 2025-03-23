'use client';

import { RefreshButton } from '@/app/components/button';

export default function ErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-foreground">Un problème est survenu</h1>
        <p className="text-foreground">
          Nous n&apos;avons pas pu accéder à la base de données. Veuillez réessayer dans quelques instants.
        </p>
        <RefreshButton />
      </div>
    </div>
  );
}
