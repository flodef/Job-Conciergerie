'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../components/loadingSpinner';
import { EmployeeWithStatus, getEmployees } from '../utils/employeeUtils';
import { getWelcomeParams } from '../utils/welcomeParams';
import { IconClock, IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';

export default function WaitingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeWithStatus | null>(null);
  const [daysWaiting, setDaysWaiting] = useState('');

  useEffect(() => {
    const checkApplicationStatus = async () => {
      setIsLoading(true);

      // Add a small delay to ensure localStorage is properly loaded
      await new Promise(resolve => setTimeout(resolve, 800));

      // Get employee data from localStorage
      const { employeeData, userType } = getWelcomeParams();

      // If user is conciergerie, redirect to missions page
      if (userType === 'conciergerie') {
        window.location.href = '/missions';
        return;
      }

      // Only proceed if user type is employee
      if (userType !== 'employee') {
        window.location.href = '/';
        return;
      }

      if (!employeeData) {
        // If no employee data, redirect to home
        window.location.href = '/';
        return;
      }

      // Get all employees
      const allEmployees = getEmployees();

      // Find employee with matching email
      const foundEmployee = allEmployees.find(emp => emp.email.toLowerCase() === employeeData.email.toLowerCase());

      if (foundEmployee) {
        setEmployee(foundEmployee);

        // If employee is accepted, redirect to missions
        if (foundEmployee.status === 'accepted') {
          window.location.href = '/missions';
          return;
        }

        // Calculate days waiting
        const createdDate = new Date(foundEmployee.createdAt);
        const today = new Date();

        // Calculate the difference in milliseconds
        const diffTime = Math.abs(today.getTime() - createdDate.getTime());

        // Calculate the difference in minutes, hours, and days
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffMinutes < 60) {
          // If less than 60 minutes, show minutes
          setDaysWaiting(`${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`);
        } else if (diffHours < 24) {
          // If less than 24 hours but more than 60 minutes, show hours and minutes
          const remainingMinutes = diffMinutes % 60;
          if (remainingMinutes > 0) {
            setDaysWaiting(
              `${diffHours} heure${diffHours > 1 ? 's' : ''} et ${remainingMinutes} minute${
                remainingMinutes > 1 ? 's' : ''
              }`,
            );
          } else {
            setDaysWaiting(`${diffHours} heure${diffHours > 1 ? 's' : ''}`);
          }
        } else {
          // If 24 hours or more, calculate days
          setDaysWaiting(`${diffDays} jour${diffDays > 1 ? 's' : ''}`);
        }
      }

      setIsLoading(false);
    };

    checkApplicationStatus();
  }, [router]);

  // Show loading spinner while checking localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="large" text="Chargement..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md bg-background overflow-hidden p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">Demande en cours d&apos;examen</h1>

        {employee && (
          <>
            <p className="mb-4">
              Bonjour{' '}
              <span className="font-semibold">
                {employee.prenom} {employee.nom}
              </span>
              ,
            </p>

            <p className="mb-4">
              Votre demande d&apos;accès a bien été reçue et est actuellement en cours d&apos;examen par la conciergerie{' '}
              <span className="font-semibold">{employee.conciergerie}</span>.
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
              <p className="text-sm text-foreground ml-7">
                <span className="font-medium">Demande soumise il y a : </span>
                <span className="font-bold">{daysWaiting}</span>
              </p>
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
        )}

        {!employee && (
          <p>
            Nous n&apos;avons pas pu trouver votre demande. Veuillez retourner à la page d&apos;accueil et soumettre une
            nouvelle demande.
          </p>
        )}

        {/* //TODO : remove this when in Prod */}
        <div className="mt-4 justify-self-center">
          <button
            onClick={() => {
              // Clear user type from localStorage for testing purposes
              localStorage.removeItem('user_type');
              window.location.href = '/';
            }}
            className="px-4 py-2 bg-primary text-background rounded-md hover:bg-primary/80"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    </main>
  );
}
