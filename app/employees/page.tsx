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
  filterEmployees,
  filterEmployeesByConciergerie,
  getEmployeeFullName,
  getEmployeeStatusChangeConfirmation,
  handleEmployeeStatusChange,
  sortEmployees,
  updateEmployeeStatus,
} from '@/app/utils/employee';
import {
  IconCheck,
  IconSortAscending,
  IconSortDescending,
  IconUser,
  IconUserCheck,
  IconUserX,
  IconX,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { cn, descriptionClassName, iconButtonClassName, textClassName } from '../utils/className';
import { getUserKey } from '../utils/user';

export default function EmployeesList() {
  const { userData, conciergerieName, isLoading: authLoading, employees: authEmployees, updateUserData } = useAuth();
  const { missions } = useMissions();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [nameSortOrder, setNameSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

  // Data is loaded by AuthProvider, no need to fetch here

  // Filter employees by conciergerie and sort them
  useEffect(() => {
    // Skip if still loading
    if (authLoading || !conciergerieName) return;

    // Filter employees by conciergerie
    const filteredEmployees = filterEmployeesByConciergerie(authEmployees, conciergerieName);

    // Apply name sorting if needed
    let sortedEmployees = sortEmployees(filteredEmployees);
    if (nameSortOrder !== 'none') {
      sortedEmployees = [...sortedEmployees].sort((a, b) => {
        const nameA = getEmployeeFullName(a).toLowerCase();
        const nameB = getEmployeeFullName(b).toLowerCase();
        return nameSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
    }

    setEmployees(sortedEmployees);
    setHasLoadedOnce(true);
  }, [conciergerieName, authLoading, authEmployees, nameSortOrder]);

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
          type: ToastType.Warning,
          message: `${getEmployeeFullName(updatedEmployee)} a été rejeté${
            emailSent ? '. Le prestataire a été notifié par email.' : '.'
          }`,
        });
      })
      .catch(error => {
        showToast({ type: ToastType.Error, message: error.toString(), error });
      });
  };

  // Handle status change
  const handleStatusChangeWithToast = async (employee: Employee, newStatus: 'accepted' | 'rejected') => {
    try {
      const message = await handleEmployeeStatusChange(
        employee,
        newStatus,
        userData,
        missions,
        employees,
        updateUserData,
      );
      showToast({ type: newStatus === 'accepted' ? ToastType.Success : ToastType.Warning, message });
    } catch (error) {
      showToast({ type: ToastType.Error, message: String(error), error: error instanceof Error ? error : undefined });
    }
  };

  const handleStatusChange = async (employee: Employee, newStatus: 'accepted' | 'rejected') => {
    const confirmation = getEmployeeStatusChangeConfirmation(employee, newStatus, missions);
    if (confirmation) {
      const id = openModal(() => (
        <ConfirmationModal
          isOpen
          title={confirmation.title}
          message={confirmation.message}
          confirmText={confirmation.confirmText}
          cancelText={confirmation.cancelText}
          isDangerous={confirmation.isDangerous}
          onConfirm={async () => {
            if (newStatus === 'rejected') rejectEmployee(employee);
            else await handleStatusChangeWithToast(employee, newStatus);
            closeModal(id);
          }}
          onClose={() => closeModal(id)}
        />
      ));
    } else {
      await handleStatusChangeWithToast(employee, newStatus);
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
      <div className="max-h-[44vh] overflow-y-auto">
        <table className="min-w-full divide-y divide-secondary">
          <thead className="bg-background sticky top-0 z-10">
            <tr>
              <th
                className="text-center text-xs font-medium text-foreground/70 uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() =>
                  setNameSortOrder(nameSortOrder === 'none' ? 'asc' : nameSortOrder === 'asc' ? 'desc' : 'none')
                }
              >
                <div className="flex items-center justify-center gap-1">
                  Coordonnées
                  {nameSortOrder === 'asc' && <IconSortAscending size={14} />}
                  {nameSortOrder === 'desc' && <IconSortDescending size={14} />}
                </div>
              </th>
              <th className="text-center text-xs font-medium text-foreground/70 uppercase tracking-wider w-16">
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
      <td className="pr-2">
        <div className="flex justify-between items-center truncate">
          <span className={cn(textClassName, 'truncate')}>{getEmployeeFullName(employee)}</span>
          <span className={descriptionClassName}>{employee.tel}</span>
        </div>
        <div className={cn(descriptionClassName, 'truncate')}>{employee.email}</div>
      </td>
      <td>
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
