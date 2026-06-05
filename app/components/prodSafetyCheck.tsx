'use client';

import { useEffect, useState } from 'react';
import { isProduction } from '@/app/actions/environment';

export function ProdSafetyCheck({ children }: { children: React.ReactNode }) {
  const [isSafe, setIsSafe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSafety = async () => {
      const isProd = await isProduction();
      const hostname = window.location.hostname;
      const isLocal =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.');

      if (isProd && isLocal) {
        setIsSafe(false);
        setError(
          "ERREUR DE SÉCURITÉ: Vous essayez d'accéder à la base de données de production depuis un environnement local. Cela est interdit pour éviter toute modification accidentelle des données de production.",
        );
      }
    };

    checkSafety();
  }, []);

  if (!isSafe) {
    return (
      <div className="fixed inset-0 bg-red-500 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl shadow-2xl">
          <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Erreur de sécurité</h1>
          <p className="text-gray-800 mb-6">{error}</p>
          <p className="text-sm text-gray-600">
            Veuillez vérifier vos variables d\'environnement et vous assurer que vous utilisez la base de données de
            développement.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
