'use client';

import { useEffect, useState } from 'react';
import { ConciergerieData } from '../components/conciergerieForm';
import { EmployeeData } from '../components/employeeForm';
import LoadingSpinner from '../components/loadingSpinner';
import { getWelcomeParams } from '../utils/welcomeParams';
import { useTheme } from '../contexts/themeProvider';

type UserInfo = {
  userType: 'conciergerie' | 'prestataire' | null;
  employeeData: EmployeeData | null;
  conciergerieData: ConciergerieData | null;
};

export default function Settings() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setPrimaryColor } = useTheme();

  useEffect(() => {
    const loadUserInfo = async () => {
      setIsLoading(true);
      // Add a small delay to simulate loading and ensure localStorage is read
      await new Promise(resolve => setTimeout(resolve, 500));

      const params = getWelcomeParams();
      setUserInfo(params as UserInfo);
      
      // Apply theme color if conciergerie data exists
      if (params.conciergerieData && params.conciergerieData.color) {
        setPrimaryColor(params.conciergerieData.color);
      }
      
      setIsLoading(false);
    };

    loadUserInfo();
  }, [setPrimaryColor]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement..." />
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center bg-background">
        <p className="text-foreground/70">Aucune information utilisateur disponible.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-background shadow-lg rounded-lg p-6 mb-6">
          {userInfo.userType === 'conciergerie' && userInfo.conciergerieData && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/70 mb-1">Nom</p>
                <p className="font-medium">{userInfo.conciergerieData.name}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70 mb-1">Couleur</p>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-6 h-6 rounded-full border border-secondary"
                    style={{ backgroundColor: userInfo.conciergerieData.color }}
                  />
                  <span>{userInfo.conciergerieData.colorName}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-foreground/70 mb-1">Email</p>
                <p className="font-medium">{userInfo.conciergerieData.email}</p>
              </div>

              {userInfo.conciergerieData.tel && (
                <div>
                  <p className="text-sm text-foreground/70 mb-1">Téléphone</p>
                  <p className="font-medium">{userInfo.conciergerieData.tel}</p>
                </div>
              )}
            </div>
          )}

          {userInfo.userType === 'prestataire' && userInfo.employeeData && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground/70 mb-1">Nom</p>
                <p className="font-medium">{userInfo.employeeData.nom}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70 mb-1">Prénom</p>
                <p className="font-medium">{userInfo.employeeData.prenom}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70 mb-1">Email</p>
                <p className="font-medium">{userInfo.employeeData.email}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70 mb-1">Téléphone</p>
                <p className="font-medium">{userInfo.employeeData.tel}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70 mb-1">Conciergerie</p>
                <p className="font-medium">{userInfo.employeeData.conciergerie}</p>
              </div>

              <div>
                <p className="text-sm text-foreground/70 mb-1">Message</p>
                <p className="font-medium whitespace-pre-wrap">
                  {userInfo.employeeData.message || 'Aucun message'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
