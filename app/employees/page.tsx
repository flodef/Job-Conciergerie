'use client';

import { updateEmployeeStatusAction } from '@/app/actions/employee';
import Accordion from '@/app/components/accordion';
import ConfirmationModal from '@/app/components/confirmationModal';
import SearchInput from '@/app/components/searchInput';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import EmployeeDetails from '@/app/employees/components/employeeDetails';
import { Conciergerie, Employee } from '@/app/types/dataTypes';
import { EmailSender } from '@/app/utils/emailSender';
import { filterEmployees, filterEmployeesByConciergerie, sortEmployees } from '@/app/utils/employee';
import { IconCheck, IconUser, IconUserCheck, IconUserX, IconX } from '@tabler/icons-react';
import { ReactNode, useEffect, useState } from 'react';
import { cn, textClassName } from '../utils/className';

export default function EmployeesList() {
  const {
    userData,
    conciergerieName,
    isLoading: authLoading,
    employees: authEmployees,
    getUserKey,
    updateUserData,
  } = useAuth();
  const { missions } = useMissions();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<Toast>();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Confirmation modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [employeeToReject, setEmployeeToReject] = useState<Employee | null>(null);

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

  // Count missions assigned to an employee
  const countEmployeeMissions = (employee: Employee): number => {
    return missions.filter(mission => getUserKey(employee) === mission.employeeId).length;
  };

  // Handle status change
  const handleStatusChange = (employee: Employee, newStatus: 'accepted' | 'rejected') => {
    // For rejection, show confirmation modal first
    if (newStatus === 'rejected') {
      setEmployeeToReject(employee);
      setIsRejectModalOpen(true);
    } else {
      updateEmployeeStatus(employee, newStatus);
    }
  };

  const updateEmployeeStatus = (employee: Employee, newStatus: 'accepted' | 'rejected') => {
    // For acceptance, proceed directly
    updateEmployeeStatusAction(employee, newStatus)
      .then(updatedEmployee => {
        if (!updatedEmployee) throw new Error("L'employé à modifier n'a pas été trouvé");

        // Update local state
        updateUserData(updatedEmployee, 'employee');

        const conciergerie = userData as Conciergerie;
        if (!conciergerie) throw new Error('Conciergerie non trouvée');

        EmailSender.sendAcceptanceEmail(
          { setToast },
          employee,
          conciergerie,
          countEmployeeMissions(employee),
          newStatus === 'accepted',
        ).then(emailSent => {
          setToast({
            type: newStatus === 'accepted' ? ToastType.Success : ToastType.Info,
            message: `${updatedEmployee.firstName} ${updatedEmployee.familyName} a été ${
              newStatus === 'accepted' ? 'accepté' : 'rejeté'
            }${emailSent ? ". L'employé a été notifié par email." : '.'}`,
          });
        });
      })
      .catch(error => {
        setToast({
          type: ToastType.Error,
          message: error.toString(),
          error,
        });
      });
  };

  // Handle confirmation of employee rejection
  const handleConfirmRejection = () => {
    if (employeeToReject) {
      updateEmployeeStatus(employeeToReject, 'rejected');
      handleDeleteRejection();
    }
  };

  // Handle cancellation of employee rejection
  const handleDeleteRejection = () => {
    setIsRejectModalOpen(false);
    setEmployeeToReject(null);
  };

  // Handle employee selection
  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  // Close employee details modal
  const closeEmployeeDetails = () => {
    setSelectedEmployee(null);
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

  return (
    <div className="bg-background min-h-full px-4">
      <ToastMessage toast={toast} onClose={() => setToast(undefined)} />

      {!hasLoadedOnce && (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {hasLoadedOnce && employees.length > 1 && (
        <SearchInput
          className="mb-2"
          placeholder="Rechercher un prestataire..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
      )}

      {/* Render employee tables in an accordion */}
      {hasLoadedOnce && (
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
      )}

      {/* Employee details modal */}
      {selectedEmployee && <EmployeeDetails employee={selectedEmployee} onClose={closeEmployeeDetails} />}

      {/* Confirmation modal for employee rejection */}
      <ConfirmationModal
        isOpen={isRejectModalOpen}
        onConfirm={handleConfirmRejection}
        onCancel={handleDeleteRejection}
        title="Confirmer le rejet de l'employé"
        message={
          employeeToReject
            ? `Vous êtes sur le point de rejeter ${employeeToReject.firstName} ${employeeToReject.familyName}.${
                countEmployeeMissions(employeeToReject) > 0
                  ? ` Cet employé sera retiré de ses ${countEmployeeMissions(employeeToReject)} mission(s).`
                  : ''
              } Il ne pourra plus accéder à l'application.`
            : ''
        }
        confirmText="Rejeter"
        cancelText="Annuler"
        isDangerous={true}
      />
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
          <div>
            {employee.firstName} {employee.familyName}
          </div>
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
              className="text-green-600 hover:text-green-900 p-1.5 rounded-full cursor-pointer"
              title="Accepter"
            >
              <IconCheck size={28} />
            </button>
          )}
          {employee.status !== 'rejected' && (
            <button
              onClick={() => onStatusChange(employee, 'rejected')}
              className="text-red-600 hover:text-red-900 p-1.5 rounded-full cursor-pointer"
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
