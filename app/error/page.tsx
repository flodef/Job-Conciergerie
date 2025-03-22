'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function ErrorPage() {
  const router = useRouter();
  const handleRefresh = () => {
    // Reload the page
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-foreground">Un problème est survenu</h1>
        <p className="mb-8 text-foreground">
          Nous n&apos;avons pas pu accéder à la base de données. Veuillez réessayer dans quelques instants.
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 transition-opacity"
        >
          Rafraîchir la page
        </button>
      </div>
    </div>
  );
}
