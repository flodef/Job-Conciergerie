'use client';

import { IconTools } from '@tabler/icons-react';

const isMaintenanceMode = () => {
  return process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
};

export const MaintenanceCheck = ({ children }: { children: React.ReactNode }) => {
  if (!isMaintenanceMode()) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 text-yellow-600">
          <IconTools size={40} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Maintenance en cours</h1>
          <p className="text-gray-600">
            La plateforme est temporairement indisponible pour cause de maintenance.
            <br />
            Veuillez réessayer plus tard.
          </p>
        </div>
        <div className="text-sm text-gray-400 mt-4">Merci de votre patience.</div>
      </div>
    </div>
  );
};
