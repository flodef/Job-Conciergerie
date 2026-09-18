'use client';

import AppVersion from '@/app/components/appVersion';
import { RefreshButton } from '@/app/components/button';

export default function ErrorPage({
  title = 'Un problème est survenu',
  message = "Nous n'avons pas pu accéder à la base de données. Veuillez réessayer dans quelques instants.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-4 ambient-bg relative">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-black mb-4">
          <span className="text-gradient">{title}</span>
        </h1>
        <p className="text-foreground">{message}</p>
        <div className="flex">
          <RefreshButton />
          <RefreshButton shouldDisconnect />
        </div>
      </div>
      <AppVersion />
    </div>
  );
}
