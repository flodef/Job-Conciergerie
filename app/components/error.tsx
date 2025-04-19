'use client';

import { RefreshButton } from '@/app/components/button';

export default function ErrorPage({
  title = 'Un problème est survenu',
  message = "Nous n'avons pas pu accéder à la base de données. Veuillez réessayer dans quelques instants.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-foreground">{title}</h1>
        <p className="text-foreground">{message}</p>
        <div className="flex">
          <RefreshButton />
          <RefreshButton shouldDisconnect />
        </div>
      </div>
    </div>
  );
}
