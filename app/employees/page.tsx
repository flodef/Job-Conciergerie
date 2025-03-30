'use client';

import { updateEmployeeStatusAction } from '@/app/actions/employee';
import Accordion from '@/app/components/accordion';
import ConfirmationModal from '@/app/components/confirmationModal';
import FullScreenModal from '@/app/components/fullScreenModal';
import SearchInput from '@/app/components/searchInput';
import { Toast, ToastMessage, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import { useMenuContext } from '@/app/contexts/menuProvider';
import { useMissions } from '@/app/contexts/missionsProvider';
import EmployeeDetails from '@/app/employees/components/employeeDetails';
import { Employee } from '@/app/types/dataTypes';
import { filterEmployees, filterEmployeesByConciergerie, sortEmployees } from '@/app/utils/employee';
import { Page } from '@/app/utils/navigation';
import { IconCheck, IconUser, IconUserCheck, IconUserX, IconX } from '@tabler/icons-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { sendEmployeeAcceptanceEmail } from '@/app/actions/email';

export default function EmployeesList() {
  const {
    conciergerieName,
    isLoading: authLoading,
    employees: authEmployees,
    fetchDataFromDatabase,
    updateUserData,
  } = useAuth();
  const { currentPage } = useMenuContext();
  const { missions } = useMissions();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<Toast>();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Confirmation modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [employeeToReject, setEmployeeToReject] = useState<Employee | null>(null);

  // Filter employees by conciergerie and sort them
  useEffect(() => {
    // Skip if still loading
    if (authLoading || !conciergerieName) return;

    // Filter employees by conciergerie
    const filteredEmployees = filterEmployeesByConciergerie(authEmployees, conciergerieName);

    setEmployees(sortEmployees(filteredEmployees));
  }, [conciergerieName, authLoading, authEmployees]);

  // Reload employees when displaying the page
  const isFetching = useRef(false);
  useEffect(() => {
    // Skip if still loading
    if (authLoading || currentPage !== Page.Employees || isFetching.current) return;

    isFetching.current = true;

    fetchDataFromDatabase('employee').then(isSuccess => {
      if (!isSuccess) {
        setToastMessage({
          type: ToastType.Error,
          message: 'Erreur lors du chargement des employés',
        });
      }
    });
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const countEmployeeMissions = (employeeId: string): number => {
    return missions.filter(mission => mission.employeeId === employeeId).length;
  };

  // Handle status change
  const handleStatusChange = (id: string, newStatus: 'accepted' | 'rejected') => {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) return;

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
    updateEmployeeStatusAction(employee.id, newStatus)
      .then(updatedEmployee => {
        if (!updatedEmployee) throw new Error("L'employé à modifier n'a pas été trouvé");

        // Update local state
        updateUserData(updatedEmployee, 'employee');

        sendEmployeeAcceptanceEmail(
          employee,
          conciergerieName || '',
          countEmployeeMissions(employee.id),
          newStatus === 'accepted',
        )
          .then(isEmailSent => {
            if (!isEmailSent) throw new Error();
          })
          .catch(() => {
            throw new Error('Email non envoyé');
          });

        setToastMessage({
          type: newStatus === 'accepted' ? ToastType.Success : ToastType.Error,
          message: `${updatedEmployee.firstName} ${updatedEmployee.familyName} a été ${
            newStatus === 'accepted' ? 'accepté' : 'rejeté'
          }`,
        });
      })
      .catch(error => {
        setToastMessage({
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
                key={employee.id}
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
    <div>
      <ToastMessage toast={toastMessage} onClose={() => setToastMessage(undefined)} />

      {employees.length > 1 && (
        <SearchInput placeholder="Rechercher un prestataire..." value={searchTerm} onChange={setSearchTerm} />
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

      {/* Employee details modal */}
      {selectedEmployee && (
        <FullScreenModal
          onClose={closeEmployeeDetails}
          title={`${selectedEmployee.firstName} ${selectedEmployee.familyName}`}
        >
          <EmployeeDetails employee={selectedEmployee} onClose={closeEmployeeDetails} />
        </FullScreenModal>
      )}

      {/* Confirmation modal for employee rejection */}
      <ConfirmationModal
        isOpen={isRejectModalOpen}
        onConfirm={handleConfirmRejection}
        onCancel={handleDeleteRejection}
        title="Confirmer le rejet de l'employé"
        message={
          employeeToReject
            ? `Vous êtes sur le point de rejeter ${employeeToReject.firstName} ${employeeToReject.familyName}.${
                countEmployeeMissions(employeeToReject.id) > 0
                  ? ` Cet employé sera retiré de ses ${countEmployeeMissions(employeeToReject.id)} mission(s).`
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
  onStatusChange: (id: string, status: 'accepted' | 'rejected') => void;
  onClick: () => void;
}) {
  return (
    <tr className="hover:bg-secondary/5 cursor-pointer transition-colors overflow-x-hidden" onClick={onClick}>
      <td className="px-1 py-1 pl-0">
        <div className="flex flex-col text-sm font-medium text-foreground truncate text-wrap max-w-28 sm:max-w-full">
          <div>
            {employee.firstName} {employee.familyName}
          </div>
        </div>
      </td>
      <td className="px-1 py-1 whitespace-nowrap">
        <div className="flex flex-col text-sm font-medium text-foreground truncate max-w-28 sm:max-w-full">
          <div>{employee.email}</div>
          <div>{employee.tel}</div>
        </div>
      </td>
      <td className="px-1 py-1 pr-0 whitespace-nowrap justify-items-center text-sm font-medium">
        <div className="flex space-x-2 justify-center" onClick={e => e.stopPropagation()}>
          {employee.status !== 'accepted' && (
            <button
              onClick={() => onStatusChange(employee.id, 'accepted')}
              className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 p-1.5 rounded-full"
              title="Accepter"
            >
              <IconCheck size={18} />
            </button>
          )}
          {employee.status !== 'rejected' && (
            <button
              onClick={() => onStatusChange(employee.id, 'rejected')}
              className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 p-1.5 rounded-full"
              title="Rejeter"
            >
              <IconX size={18} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
