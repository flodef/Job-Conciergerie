'use client';

import { sendConciergerieVerificationEmail, sendEmployeeRegistrationEmail } from '@/app/actions/email';
import ErrorPage from '@/app/components/error';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { Conciergerie, Employee } from '@/app/types/dataTypes';
import { setPrimaryColor } from '@/app/utils/color';
import { getTimeDifference } from '@/app/utils/date';
import { IconAlertCircle, IconCircleCheck, IconClock, IconMailForward } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function WaitingPage() {
  const {
    userId,
    userType,
    isLoading: authLoading,
    sentEmailError,
    setSentEmailError,
    conciergerieName,
    conciergeries,
    employees,
  } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee>();
  const [daysWaiting, setDaysWaiting] = useState('');
  const [conciergerie, setConciergerie] = useState<Conciergerie>();
  const [toastMessage, setToastMessage] = useState<Toast>();

  const handleConciergerie = useCallback(
    (userId: string) => {
      const foundConciergerie = conciergeries.find(c => c.name === conciergerieName);
      setConciergerie(foundConciergerie);
      setPrimaryColor(foundConciergerie?.color);

      if (sentEmailError && foundConciergerie) {
        sendConciergerieVerificationEmail(foundConciergerie, userId).then(isEmailSent => {
          if (isEmailSent) {
            setSentEmailError(undefined);
          } else {
            setToastMessage({
              type: ToastType.Error,
              message: "Une erreur est survenue lors de l'envoi de l'email de vérification",
            });
          }
        });
      }
      setIsLoading(false);
    },
    [conciergeries, conciergerieName, sentEmailError, setSentEmailError],
  );

  const handleEmployee = useCallback(
    (userId: string) => {
      // Check if employee exists in database with this ID
      const foundEmployee = employees?.find(e => e.id === userId);
      if (!foundEmployee) return;

      setEmployee(foundEmployee);

      // Calculate time waiting
      if (foundEmployee.createdAt) {
        const timeDifference = getTimeDifference(new Date(foundEmployee.createdAt), new Date());
        setDaysWaiting(timeDifference);
      }

      // Send notification email to conciergerie
      if (sentEmailError) {
        const selectedConciergerie = conciergeries.find(c => c.name === foundEmployee.conciergerieName);
        if (!selectedConciergerie) throw new Error('Conciergerie not found');
        if (!selectedConciergerie.email) throw new Error('Conciergerie email not found');

        sendEmployeeRegistrationEmail(selectedConciergerie, foundEmployee).then(isEmailSent => {
          if (isEmailSent) {
            setSentEmailError(undefined);
          } else {
            setToastMessage({
              type: ToastType.Error,
              message: "Une erreur est survenue lors de l'envoi de l'email de confirmation",
            });
          }
        });
      }

      setIsLoading(false);
    },
    [employees, conciergeries, setSentEmailError, sentEmailError],
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

  if (!userId || !userType) return <ErrorPage />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <ToastMessage toast={toastMessage} onClose={() => setToastMessage(undefined)} />

      <div className="w-full max-w-md bg-background overflow-hidden p-6">
        {conciergerie ? (
          // Conciergerie waiting page
          <>
            <h1 className="text-2xl font-bold mb-4 text-center">Vérification en cours</h1>

            <div className="flex items-center justify-center mb-6">
              <IconMailForward size={60} className="text-primary" />
            </div>

            <p className="mb-4">
              Nous avons envoyé un email de vérification à l&apos;adresse associée à votre conciergerie.
            </p>

            <p className="mb-4">
              Veuillez vérifier votre boîte de réception et suivre les instructions pour activer votre compte.
            </p>

            <div className="bg-secondary/10 p-4 rounded-lg mb-4">
              <div className="flex items-center mb-2">
                <IconClock size={25} className="text-yellow-500 mr-2" />
                <p className="text-sm text-foreground font-medium">
                  Statut actuel : <span className="font-bold text-yellow-500">En attente de vérification</span>
                </p>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg mb-6">
              <p className="text-sm text-foreground">
                <span className="font-medium">Délai de traitement habituel :</span> 24 heures ouvrées
              </p>
              <p className="text-sm text-foreground mt-2">
                Une fois votre compte vérifié, vous pourrez accéder directement à l&apos;application lors de votre
                prochaine visite.
              </p>
            </div>
          </>
        ) : employee ? (
          // Employee waiting page
          <>
            <h1 className="text-2xl font-bold mb-4 text-center">Demande en cours d&apos;examen</h1>

            <p className="mb-4">
              Bonjour{' '}
              <span className="font-semibold">
                {employee.firstName} {employee.familyName}
              </span>
              ,
            </p>

            <p className="mb-4">
              Votre demande d&apos;accès a bien été reçue et est actuellement en cours d&apos;examen par la conciergerie{' '}
              <span className="font-semibold">{employee.conciergerieName}</span>.
            </p>

            <div className="bg-secondary/10 p-4 rounded-lg mb-4">
              <div className="flex items-center mb-2">
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
              {daysWaiting && (
                <p className="text-sm text-foreground ml-7">
                  <span className="font-medium">Demande soumise il y a : </span>
                  <span className="font-bold">{daysWaiting}</span>
                </p>
              )}
            </div>

            <div className="bg-primary/10 p-4 rounded-lg mb-6">
              <p className="text-sm text-foreground">
                <span className="font-medium">Délai de traitement habituel :</span> 48 heures ouvrées
              </p>
              <p className="text-sm text-foreground mt-2">
                Une fois votre demande acceptée, vous pourrez accéder directement à l&apos;application lors de votre
                prochaine visite.
              </p>
            </div>
          </>
        ) : !isLoading ? (
          // Error state
          <ErrorPage
            shouldDisconnect
            title="Demande non trouvée"
            message="Nous n'avons pas pu trouver votre demande. Veuillez retourner à la page d'accueil et soumettre une nouvelle demande."
          />
        ) : null}
      </div>
    </div>
  );
}
