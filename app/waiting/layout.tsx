import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demande en attente',
  description: 'Votre demande est en cours de traitement',
};

export default function WaitingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
