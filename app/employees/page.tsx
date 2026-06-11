'use client';

import Accordion from '@/app/components/accordion';
import ConfirmationModal from '@/app/components/confirmationModal';
import M3LoadingSpinner from '@/app/components/m3LoadingSpinner';
import SearchInput from '@/app/components/searchInput';
import { ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import { useModal } from '@/app/contexts/modalProvider';
import { useToast } from '@/app/contexts/toastProvider';
import EmployeeDetails from '@/app/employees/components/employeeDetails';
import type { Employee } from '@/app/types/dataTypes';
import {
  countEmployeeMissions,
  filterEmployees,
  filterEmployeesByConciergerie,
  getEmployeeFullName,
  sortEmployees,
  updateEmployeeStatus,
} from '@/app/utils/employee';
import { IconCheck, IconUser, IconUserCheck, IconUserX, IconX } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { cn, iconButtonClassName, textClassName } from '../utils/className';
import { getUserKey } from '../utils/user';

export default function EmployeesList() {
  const { userData, conciergerieName, isLoading: authLoading, employees: authEmployees, updateUserData } = useAuth();
  const { missions } = useMissions();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Data is loaded by AuthProvider, no need to fetch here

  // Filter employees by conciergerie and sort them
  useEffect(() => {
    // Skip if still loading
    if (authLoading || !conciergerieName) return;

    // Filter employees by conciergerie
    const filteredEmployees = filterEmployeesByConciergerie(authEmployees, conciergerieName);

    setEmployees(sortEmployees(filteredEmployees));
    setHasLoadedOnce(true);
  }, [conciergerieName, authLoading, authEmployees]);

  // Filter employees by status
  const pendingEmployees = employees.filter(
    emp => emp.status === 'pending' && (searchTerm ? filterEmployees([emp], searchTerm).length > 0 : true),
  );
  const acceptedEmployees = employees.filter(
    emp => emp.status === 'accepted' && (searchTerm ? filterEmployees([emp], searchTerm).length > 0 : true),
  );
  const rejectedEmployees = employees.filter(
    emp => emp.status === 'rejected' && (searchTerm ? filterEmployees([emp], searchTerm).length > 0 : true),
  );

  const rejectEmployee = (employee: Employee) => {
    updateEmployeeStatus(employee, 'rejected', userData, missions, employees, updateUserData)
      .then(({ updatedEmployee, emailSent }) => {
        showToast({
          type: ToastType.Info,
          message: `${getEmployeeFullName(updatedEmployee)} a été rejeté${
            emailSent ? ". L'employé a été notifié par email." : '.'
          }`,
        });
      })
      .catch(error => {
        showToast({ type: ToastType.Error, message: error.toString(), error });
      });
  };

  // Handle status change
  const handleStatusChange = (employee: Employee, newStatus: 'accepted' | 'rejected') => {
    // For rejection, show confirmation modal first
    if (newStatus === 'rejected') {
      const id = openModal(() => (
        <ConfirmationModal
          isOpen
          title="Rejeter le prestataire"
          message={`Vous êtes sur le point de rejeter ${getEmployeeFullName(employee)}.${
            countEmployeeMissions(employee, missions) > 0
              ? ` Cet employé sera retiré de ses ${countEmployeeMissions(employee, missions)} mission(s).`
              : ''
          } Il ne pourra plus accéder à l'application.`}
          confirmText="Rejeter"
          cancelText="Annuler"
          isDangerous
          onConfirm={() => rejectEmployee(employee)}
          onClose={() => closeModal(id)}
        />
      ));
    } else {
      updateEmployeeStatus(employee, newStatus, userData, missions, employees, updateUserData)
        .then(({ updatedEmployee, emailSent }) => {
          showToast({
            type: newStatus === 'accepted' ? ToastType.Success : ToastType.Info,
            message: `${getEmployeeFullName(updatedEmployee)} a été ${
              newStatus === 'accepted' ? 'accepté' : 'rejeté'
            }${emailSent ? ". L'employé a été notifié par email." : '.'}`,
          });
        })
        .catch(error => {
          showToast({ type: ToastType.Error, message: error.toString(), error });
        });
    }
  };

  // Handle employee selection
  const handleEmployeeClick = (employee: Employee) => {
    const id = openModal(() => <EmployeeDetails employee={employee} onClose={() => closeModal(id)} />);
  };

  // Helper function to render employee table for each status
  const renderEmployeeTable = (employees: Employee[], emptyMessage: string): ReactNode => {
    if (employees.length === 0)
      return <p className="text-light text-center italic">Aucun prestataire {emptyMessage}</p>;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-secondary">
          <thead className="bg-secondary/10">
            <tr>
              <th className="px-1 py-1 text-center text-xs font-medium text-foreground/70 uppercase tracking-wider">
                Nom
              </th>
              <th className="px-1 py-1 text-center text-xs font-medium text-foreground/70 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-1 py-1 text-center text-xs font-medium text-foreground/70 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-secondary">
            {employees.map(employee => (
              <EmployeeRow
                key={getUserKey(employee)}
                employee={employee}
                onStatusChange={handleStatusChange}
                onClick={() => handleEmployeeClick(employee)}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!hasLoadedOnce) return <M3LoadingSpinner />;

  return (
    <div className="bg-background min-h-full px-4">
      {employees.length > 1 && (
        <SearchInput
          className="mb-2"
          placeholder="Rechercher un prestataire..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
      )}

      {/* Render employee tables in an accordion */}
      <div className="w-full">
        <Accordion
          items={[
            {
              title: `En attente (${pendingEmployees.length})`,
              icon: <IconUser size={20} />,
              content: renderEmployeeTable(pendingEmployees, 'en attente'),
            },
            {
              title: `Acceptés (${acceptedEmployees.length})`,
              icon: <IconUserCheck size={20} />,
              content: renderEmployeeTable(acceptedEmployees, 'accepté'),
            },
            {
              title: `Rejetés (${rejectedEmployees.length})`,
              icon: <IconUserX size={20} />,
              content: renderEmployeeTable(rejectedEmployees, 'rejeté'),
            },
          ]}
        />
      </div>
    </div>
  );
}

// Employee row component
function EmployeeRow({
  employee,
  onStatusChange,
  onClick,
}: {
  employee: Employee;
  onStatusChange: (employee: Employee, status: 'accepted' | 'rejected') => void;
  onClick: () => void;
}) {
  return (
    <tr className="hover:bg-secondary/5 cursor-pointer transition-colors overflow-x-hidden" onClick={onClick}>
      <td className="px-1 py-1 pl-0">
        <div className={cn(textClassName, 'flex flex-col truncate text-wrap max-w-28 sm:max-w-full')}>
          {getEmployeeFullName(employee)}
        </div>
      </td>
      <td className="px-1 py-1 whitespace-nowrap">
        <div className={cn(textClassName, 'flex flex-col truncate max-w-28 sm:max-w-full')}>
          <div>{employee.email}</div>
          <div>{employee.tel}</div>
        </div>
      </td>
      <td className={cn(textClassName, 'px-1 py-1 pr-0 whitespace-nowrap justify-items-center')}>
        <div className="flex space-x-2 justify-center" onClick={e => e.stopPropagation()}>
          {employee.status !== 'accepted' && (
            <button
              onClick={() => onStatusChange(employee, 'accepted')}
              className={iconButtonClassName('success')}
              title="Accepter"
            >
              <IconCheck size={28} />
            </button>
          )}
          {employee.status !== 'rejected' && (
            <button
              onClick={() => onStatusChange(employee, 'rejected')}
              className={iconButtonClassName('dangerous')}
              title="Rejeter"
            >
              <IconX size={28} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
