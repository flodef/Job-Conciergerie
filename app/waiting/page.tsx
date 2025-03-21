'use client';

import { loadEmail } from '@/app/actions/email';
import { fetchEmployeeById } from '@/app/actions/employee';
import LoadingSpinner from '@/app/components/loadingSpinner';
import { useAuth } from '@/app/contexts/authProvider';
import { Employee } from '@/app/types/types';
import { convertUTCDateToUserTime, getTimeDifference } from '@/app/utils/date';
import { IconAlertCircle, IconCircleCheck, IconClock, IconMailForward } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

export default function WaitingPage() {
  const { userId, userType, isLoading: authLoading, employeeData, disconnect } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee>();
  const [daysWaiting, setDaysWaiting] = useState('');
  const [isConciergerie, setIsConciergerie] = useState(false);

  // Hack to make the action server works
  // eslint-disable-next-line
  const load = async () => await loadEmail();

  // Use a ref to track if we've already loaded the data to prevent infinite loops
  const hasLoadedDataRef = useRef(false);

  useEffect(() => {
    const loadEmployeeData = async () => {
      // Wait for auth to be loaded or if we've already loaded the data
      if (authLoading || !userId || hasLoadedDataRef.current) return;

      // Mark that we're loading data to prevent infinite loops
      hasLoadedDataRef.current = true;

      // Handle conciergerie user type
      if (userType === 'conciergerie') {
        setIsConciergerie(true);
        setIsLoading(false);
        return;
      }

      // Handle employee user type
      if (userType === 'employee') {
        try {
          // Check if employee exists in database with this ID
          const foundEmployee = employeeData || (await fetchEmployeeById(userId));

          if (foundEmployee) {
            setEmployee(foundEmployee);

            // Calculate time waiting
            if (foundEmployee.createdAt) {
              const createdAt = convertUTCDateToUserTime(new Date(foundEmployee.createdAt));
              setDaysWaiting(getTimeDifference(createdAt, new Date()));
            }
          } else {
            // Employee not found in database with this ID
            // This shouldn't happen if the form submission worked correctly
            console.error('Employee not found in database with ID:', userId);
          }
        } catch (error) {
          console.error('Error fetching employee:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadEmployeeData();
  }, [userId, userType, authLoading, employeeData]);

  // Show loading spinner while checking localStorage
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md bg-background overflow-hidden p-6">
        {isLoading || authLoading ? (
          <div className="flex flex-col items-center justify-center">
            <LoadingSpinner size="large" text="Chargement..." />
          </div>
        ) : isConciergerie ? (
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
        ) : (
          // Error state
          <>
            <h1 className="text-2xl font-bold mb-4 text-center">Demande non trouvée</h1>
            <p className="mb-4 text-center">
              Nous n&apos;avons pas pu trouver votre demande. Veuillez retourner à la page d&apos;accueil et soumettre
              une nouvelle demande.
            </p>
            <div className="flex justify-center mt-6">
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Retour à l&apos;accueil
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
