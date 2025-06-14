'use client';

import { RefreshButton } from '@/app/components/button';
import { EmailRetryManager } from '@/app/components/emailRetryManager';
import ErrorPage from '@/app/components/error';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import Tooltip from '@/app/components/tooltip';
import { useAuth } from '@/app/contexts/authProvider';
import { formatId } from '@/app/utils/id';
import { Conciergerie, Employee } from '@/app/types/dataTypes';
import { setPrimaryColor } from '@/app/utils/color';
import { getTimeDifference, getTimeRemaining, isElapsedTimeLessThan } from '@/app/utils/date';
import {
  IconAlertCircle,
  IconCircleCheck,
  IconClock,
  IconCopy,
  IconHelpCircle,
  IconMailForward,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const EMPLOYEE_MINIMUM_WAITING_TIME = 60; // minimum waiting time in minutes
const CONCIERGERIE_MINIMUM_WAITING_TIME = 5; // minimum waiting time in minutes
const REFRESH_BUTTON_DISABLE_TIME = 1; // time in minutes

export default function WaitingPage() {
  const {
    userId,
    userType,
    isLoading: authLoading,
    userData,
    conciergerieName,
    getUserKey,
    findEmployee,
    findConciergerie,
  } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee>();
  const [timeWaiting, setTimeWaiting] = useState('');
  const [creationDate, setCreationDate] = useState<Date>(new Date());
  const [minimumWaitingTime, setMinimumWaitingTime] = useState(0);
  const [refreshDisabled, setRefreshDisabled] = useState(true);
  const [conciergerie, setConciergerie] = useState<Conciergerie>();
  const [toast, setToast] = useState<Toast>();

  const handleConciergerie = useCallback(() => {
    const foundConciergerie = findConciergerie(conciergerieName ?? null);
    setConciergerie(foundConciergerie);
    setPrimaryColor(foundConciergerie?.color);
    setMinimumWaitingTime(CONCIERGERIE_MINIMUM_WAITING_TIME);

    setIsLoading(false);
  }, [conciergerieName, findConciergerie]);

  const handleEmployee = useCallback(() => {
    const foundEmployee = findEmployee(getUserKey(userData as Employee));
    setEmployee(foundEmployee);
    setCreationDate(foundEmployee?.createdAt ? new Date(foundEmployee.createdAt) : new Date());
    setMinimumWaitingTime(EMPLOYEE_MINIMUM_WAITING_TIME);

    setIsLoading(false);
  }, [userData, findEmployee, getUserKey]);

  // Use a ref to track if we've already loaded the data to prevent infinite loops
  const hasLoadedDataRef = useRef(false);
  useEffect(() => {
    // Wait for auth to be loaded or if we've already loaded the data
    if (authLoading || hasLoadedDataRef.current || !userType) return;

    // Mark that we're loading data to prevent infinite loops
    hasLoadedDataRef.current = true;

    // Handle conciergerie user type
    const handleUser = {
      conciergerie: handleConciergerie,
      employee: handleEmployee,
    }[userType];
    handleUser();
  }, [userType, authLoading, handleConciergerie, handleEmployee]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (creationDate) {
      interval = setInterval(() => {
        const timeDifference = getTimeDifference(creationDate, new Date());
        setTimeWaiting(timeDifference);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [creationDate]);

  // Effect to handle the refresh button enabling after 1 minute
  useEffect(() => {
    // Set a timeout to enable the refresh button after 1 minute
    const timeout = setTimeout(() => {
      setRefreshDisabled(false);
    }, REFRESH_BUTTON_DISABLE_TIME * 60 * 1000); // 1 minute in milliseconds

    return () => clearTimeout(timeout);
  }, []); // Empty dependency array means this runs once on component mount

  // Helper function to check if request is less than minimum waiting time
  const isRequestLessThanMinimumWaitingTime = () => isElapsedTimeLessThan(creationDate, minimumWaitingTime);

  const copyToClipboard = (id: string) => {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        setToast({
          type: ToastType.Success,
          message: 'ID copié dans le presse-papier',
        });
      })
      .catch(err => {
        setToast({
          type: ToastType.Error,
          message: "Impossible de copier l'ID",
          error: err,
        });
      });
  };

  const DeviceId = () => {
    if (!userId) return null;

    return (
      <div className="flex items-center mb-0.5 ml-7 text-sm text-foreground gap-1">
        <span>ID appareil : </span>
        <span className="font-mono self-end">{formatId(userId)}</span>
        <button
          onClick={() => copyToClipboard(userId)}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Copier l'ID"
        >
          <IconCopy size={14} stroke={1.5} />
        </button>
      </div>
    );
  };

  const RefreshButtons = () => (
    <div className="flex items-center justify-center">
      <RefreshButton disabled={refreshDisabled} />
      <RefreshButton shouldDisconnect disabled={isRequestLessThanMinimumWaitingTime()} />
      {isRequestLessThanMinimumWaitingTime() && creationDate ? (
        <Tooltip className="mt-4" size="large" icon={IconHelpCircle}>
          Pour éviter le spam, vous pourrez tenter une nouvelle demande dans{' '}
          {getTimeRemaining(new Date(creationDate.getTime() + minimumWaitingTime * 60 * 1000))}
        </Tooltip>
      ) : refreshDisabled ? (
        <Tooltip className="mt-4" size="large" icon={IconClock}>
          Pour éviter le spam, vous devez attendre 1 minute avant de rafraîchir la page
        </Tooltip>
      ) : null}
    </div>
  );

  if (!userType) return <ErrorPage />;

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

            <p>Un email de vérification à été envoyé à l&apos;adresse email associée à votre conciergerie.</p>
            <p>Veuillez vérifier votre boîte de réception et suivre les instructions pour activer votre compte.</p>

            <div className="bg-secondary/10 p-3 rounded-lg">
              <div className="flex items-center">
                <IconClock size={25} className="text-yellow-500 mr-2" />
                <p className="text-sm text-foreground font-medium">
                  Statut actuel : <span className="font-bold text-yellow-500">En attente de vérification</span>
                </p>
              </div>
            </div>
            <DeviceId />

            <div className="bg-primary/10 p-3 rounded-lg">
              <p className="text-sm text-foreground">
                Une fois votre compte vérifié, vous pourrez accéder directement à l&apos;application lors de votre
                prochaine visite.
              </p>
            </div>

            <RefreshButtons />
          </>
        ) : employee ? (
          // Employee waiting page
          <>
            <h1 className="text-2xl font-bold text-center">
              {employee.status === 'pending'
                ? 'Demande en cours d&apos;examen'
                : employee.status === 'accepted'
                ? 'Nouvel appareil connecté'
                : 'Demande rejetée'}
            </h1>

            <p>
              Bonjour{' '}
              <span className="font-semibold">
                {employee.firstName} {employee.familyName}
              </span>
              ,
            </p>

            {employee.status === 'pending' && (
              <p>
                Votre demande d&apos;accès a bien été reçue et est actuellement en cours d&apos;examen par la
                conciergerie <span className="font-semibold">{employee.conciergerieName}</span>. <br />
                Un email vous sera envoyé une fois votre demande examinée.
              </p>
            )}
            {employee.status === 'accepted' && (
              <p>
                Un email de vérification à été envoyé à l&apos;adresse email associée à votre compte.
                <br />
                Veuillez vérifier votre boîte de réception et suivre les instructions pour donner l&apos;accès à cet
                appareil.
              </p>
            )}
            {employee.status === 'rejected' && (
              <p>Votre demande d&apos;accès a malheureusement été rejetée par la conciergerie.</p>
            )}
            <div className="bg-secondary/10 p-3 rounded-lg">
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
                    {{ pending: 'En attente de validation', accepted: 'Accepté', rejected: 'Rejeté' }[employee.status]}
                  </span>
                </p>
              </div>
              <DeviceId />
              {timeWaiting && (
                <p className="text-sm text-foreground ml-7">
                  <span className="font-medium">Demande soumise il y a : </span>
                  <span className="font-bold">{timeWaiting}</span>
                </p>
              )}
            </div>

            <div className="bg-primary/10 p-3 rounded-lg">
              {employee.status === 'accepted' ? (
                <span className="text-sm text-foreground">
                  Pour accéder à votre compte depuis cet appareil, vous devez :
                  <ul className="list-disc list-inside">
                    <li>
                      soit le <span className="font-semibold">valider depuis l&apos;email</span> envoyé sur
                      l&apos;adresse associée à votre compte
                    </li>
                    <li>
                      soit l&apos;accepter depuis votre appareil déjà connecté en allant dans{' '}
                      <span className="font-semibold">Paramètres &gt; Appareils connectés</span>.
                    </li>
                  </ul>
                </span>
              ) : (
                <>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Délai de traitement habituel :</span> 48 heures ouvrées
                  </p>
                  <p className="text-sm text-foreground mt-2">
                    Une fois votre demande acceptée, vous pourrez accéder directement à l&apos;application lors de votre
                    prochaine visite.
                  </p>
                </>
              )}
            </div>

            <RefreshButtons />
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
