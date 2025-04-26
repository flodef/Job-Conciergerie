'use client';

import { RefreshButton } from '@/app/components/button';
import { EmailRetryManager } from '@/app/components/emailRetryManager';
import ErrorPage from '@/app/components/error';
import { Toast, ToastMessage } from '@/app/components/toastMessage';
import Tooltip from '@/app/components/tooltip';
import { useAuth } from '@/app/contexts/authProvider';
import { Conciergerie, Employee } from '@/app/types/dataTypes';
import { setPrimaryColor } from '@/app/utils/color';
import { getTimeDifference, getTimeRemaining } from '@/app/utils/date';
import { IconAlertCircle, IconCircleCheck, IconClock, IconHelpCircle, IconMailForward } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const EMPLOYEE_MINIMUM_WAITING_TIME = 60; // minimum waiting time in minutes
const CONCIERGERIE_MINIMUM_WAITING_TIME = 5; // minimum waiting time in minutes

export default function WaitingPage() {
  const { userId, userType, isLoading: authLoading, conciergerieName, conciergeries, employees } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee>();
  const [timeWaiting, setTimeWaiting] = useState('');
  const [creationDate, setCreationDate] = useState<Date>(new Date(0));
  const [pageLoadTime] = useState<Date>(new Date());
  const [conciergerie, setConciergerie] = useState<Conciergerie>();
  const [toast, setToast] = useState<Toast>();

  const handleConciergerie = useCallback(() => {
    const foundConciergerie = conciergeries.find(c => c.name === conciergerieName);
    setConciergerie(foundConciergerie);
    setPrimaryColor(foundConciergerie?.color);

    setIsLoading(false);
  }, [conciergeries, conciergerieName]);

  const handleEmployee = useCallback(
    (userId: string) => {
      // Check if employee exists in database with this ID
      const foundEmployee = employees?.find(e => e.id === userId);
      if (!foundEmployee) return;

      setEmployee(foundEmployee);

      // Calculate time waiting
      if (foundEmployee.createdAt) {
        const createdDate = new Date(foundEmployee.createdAt);
        setCreationDate(createdDate);
      }

      setIsLoading(false);
    },
    [employees],
  );

  // Use a ref to track if we've already loaded the data to prevent infinite loops
  const hasLoadedDataRef = useRef(false);
  useEffect(() => {
    // Wait for auth to be loaded or if we've already loaded the data
    if (authLoading || hasLoadedDataRef.current || !userId || !userType) return;

    // Mark that we're loading data to prevent infinite loops
    hasLoadedDataRef.current = true;

    // Handle conciergerie user type
    const handleUser = {
      conciergerie: handleConciergerie,
      employee: handleEmployee,
    }[userType];
    handleUser(userId);
  }, [userId, userType, authLoading, handleConciergerie, handleEmployee, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (creationDate.getTime() !== 0) {
      interval = setInterval(() => {
        const timeDifference = getTimeDifference(creationDate, new Date());
        setTimeWaiting(timeDifference);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [creationDate]);

  // Helper function to check if request is less than minimum waiting time
  const isRequestLessThanMinimumWaitingTime = () => {
    const referenceDate = creationDate.getTime() !== 0 ? creationDate : pageLoadTime;
    const minimumWaitingTime =
      creationDate.getTime() !== 0 ? EMPLOYEE_MINIMUM_WAITING_TIME : CONCIERGERIE_MINIMUM_WAITING_TIME;
    const now = new Date();
    const diffInMinutes = (now.getTime() - referenceDate.getTime()) / (1000 * 60);
    return diffInMinutes < minimumWaitingTime;
  };

  const refreshButton = (
    <div className="flex items-center justify-center">
      <RefreshButton shouldDisconnect disabled={isRequestLessThanMinimumWaitingTime()} />
      {isRequestLessThanMinimumWaitingTime() && (
        <Tooltip size="small" icon={IconHelpCircle}>
          Pour éviter le spam, vous pourrez réessayer dans {getTimeRemaining(creationDate)}
        </Tooltip>
      )}
    </div>
  );

  if (!userId || !userType) return <ErrorPage />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <EmailRetryManager onToastChange={setToast} />
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />

      <div className="w-full max-w-md bg-background overflow-hidden p-6 flex flex-col gap-4">
        {conciergerie ? (
          // Conciergerie waiting page
          <>
            <h1 className="text-2xl font-bold text-center">Vérification en cours</h1>

            <div className="flex items-center justify-center">
              <IconMailForward size={60} className="text-primary" />
            </div>

            <p>Nous avons envoyé un email de vérification à l&apos;adresse associée à votre conciergerie.</p>

            <p>Veuillez vérifier votre boîte de réception et suivre les instructions pour activer votre compte.</p>

            <div className="bg-secondary/10 p-4 rounded-lg">
              <div className="flex items-center">
                <IconClock size={25} className="text-yellow-500 mr-2" />
                <p className="text-sm text-foreground font-medium">
                  Statut actuel : <span className="font-bold text-yellow-500">En attente de vérification</span>
                </p>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="text-sm text-foreground">
                <span className="font-medium">Délai de traitement habituel :</span> 24 heures ouvrées
              </p>
              <p className="text-sm text-foreground mt-2">
                Une fois votre compte vérifié, vous pourrez accéder directement à l&apos;application lors de votre
                prochaine visite.
              </p>
            </div>

            {refreshButton}
          </>
        ) : employee ? (
          // Employee waiting page
          <>
            <h1 className="text-2xl font-bold text-center">Demande en cours d&apos;examen</h1>

            <p>
              Bonjour{' '}
              <span className="font-semibold">
                {employee.firstName} {employee.familyName}
              </span>
              ,
            </p>

            <p>
              Votre demande d&apos;accès a bien été reçue et est actuellement en cours d&apos;examen par la conciergerie{' '}
              <span className="font-semibold">{employee.conciergerieName}</span>.
            </p>

            <div className="bg-secondary/10 p-4 rounded-lg">
              <div className="flex items-center">
                {employee.status === 'pending' ? (
                  <IconClock size={25} className="text-yellow-500 mr-2" />
                ) : employee.status === 'accepted' ? (
                  <IconCircleCheck size={25} className="text-green-500 mr-2" />
                ) : (
                  <IconAlertCircle size={25} className="text-red-500 mr-2" />
                )}
                <p className="text-sm text-foreground font-medium">
                  Statut actuel :{' '}
                  <span
                    className={`font-bold ${
                      employee.status === 'pending'
                        ? 'text-yellow-500'
                        : employee.status === 'accepted'
                        ? 'text-green-500'
                        : 'text-red-500'
                    }`}
                  >
                    {
                      { pending: 'En attente de validation', accepted: 'Acceptée', rejected: 'Rejetée' }[
                        employee.status
                      ]
                    }
                  </span>
                </p>
              </div>
              {timeWaiting && (
                <p className="text-sm text-foreground ml-7">
                  <span className="font-medium">Demande soumise il y a : </span>
                  <span className="font-bold">{timeWaiting}</span>
                </p>
              )}
            </div>

            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="text-sm text-foreground">
                <span className="font-medium">Délai de traitement habituel :</span> 48 heures ouvrées
              </p>
              <p className="text-sm text-foreground mt-2">
                Une fois votre demande acceptée, vous pourrez accéder directement à l&apos;application lors de votre
                prochaine visite.
              </p>
            </div>

            {refreshButton}
          </>
        ) : !isLoading ? (
          // Error state
          <ErrorPage
            title="Demande non trouvée"
            message="Nous n'avons pas pu trouver votre demande. Veuillez retourner à la page d'accueil et soumettre une nouvelle demande."
          />
        ) : null}
      </div>
    </div>
  );
}
