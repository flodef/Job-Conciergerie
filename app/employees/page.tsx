'use client';

import FullScreenModal from '@/app/components/fullScreenModal';
import SearchInput from '@/app/components/searchInput';
import { ToastMessage, ToastProps, ToastType } from '@/app/components/toastMessage';
import { useAuth } from '@/app/contexts/authProvider';
import EmployeeDetails from '@/app/employees/components/employeeDetails';
import { Employee } from '@/app/types/types';
import {
  filterEmployees,
  filterEmployeesByConciergerie,
  getEmployees,
  sortEmployees,
  updateEmployeeStatus,
} from '@/app/utils/employee';
import { IconCheck, IconUser, IconUserCheck, IconUserX, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

export default function EmployeesList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<ToastProps>();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { userType, conciergerieName, isLoading: authLoading } = useAuth();

  // Load employees on component mount - must be called before any conditional returns
  useEffect(() => {
    // Skip if still loading
    if (authLoading || !userType || !conciergerieName) return;

    const allEmployees = getEmployees();

    // Filter employees by conciergerie
    const filteredEmployees = filterEmployeesByConciergerie(allEmployees, conciergerieName);

    setEmployees(sortEmployees(filteredEmployees));
  }, [conciergerieName, authLoading, userType]);

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

  // Handle status change
  const handleStatusChange = (id: string, newStatus: 'accepted' | 'rejected') => {
    updateEmployeeStatus(id, newStatus);

    // Update local state
    const updatedEmployees = employees.map(emp =>
      emp.id === id ? { ...emp, status: newStatus, message: undefined, conciergerieName: undefined } : emp,
    );

    setEmployees(sortEmployees(updatedEmployees));

    // Show toast
    const employee = employees.find(emp => emp.id === id);
    if (employee) {
      setToastMessage({
        type: newStatus === 'accepted' ? ToastType.Success : ToastType.Error,
        message: `${employee.firstName} ${employee.familyName} a été ${
          newStatus === 'accepted' ? 'accepté' : 'rejeté'
        }`,
      });
    }
  };

  // Handle employee selection
  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  // Close employee details modal
  const closeEmployeeDetails = () => {
    setSelectedEmployee(null);
  };

  return (
    <div>
      <SearchInput
        placeholder="Rechercher un prestataire..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

      <div className="space-y-8 w-full">
        {/* Pending employees */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <IconUser size={20} />
            <h2 className="text-lg font-semibold">En attente ({pendingEmployees.length})</h2>
          </div>

          {pendingEmployees.length > 0 ? (
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
                  {pendingEmployees.map(employee => (
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
          ) : (
            <p className="text-foreground/60 italic">Aucun prestataire en attente</p>
          )}
        </div>

        {/* Accepted employees */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <IconUserCheck size={20} />
            <h2 className="text-lg font-semibold">Acceptés ({acceptedEmployees.length})</h2>
          </div>

          {acceptedEmployees.length > 0 ? (
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
                  {acceptedEmployees.map(employee => (
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
          ) : (
            <p className="text-foreground/60 italic">Aucun prestataire accepté</p>
          )}
        </div>

        {/* Rejected employees */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <IconUserX size={20} />
            <h2 className="text-lg font-semibold">Rejetés ({rejectedEmployees.length})</h2>
          </div>

          {rejectedEmployees.length > 0 ? (
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
                  {rejectedEmployees.map(employee => (
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
          ) : (
            <p className="text-foreground/60 italic">Aucun prestataire rejeté</p>
          )}
        </div>
      </div>

      <ToastMessage toast={toastMessage} onClose={() => setToastMessage(undefined)} />

      {/* Employee details modal */}
      {selectedEmployee && (
        <FullScreenModal onClose={closeEmployeeDetails} title="Détails du prestataire">
          <EmployeeDetails employee={selectedEmployee} onClose={closeEmployeeDetails} />
        </FullScreenModal>
      )}
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
    <tr className="hover:bg-secondary/5 cursor-pointer transition-colors" onClick={onClick}>
      <td className="px-1 py-1 justify-items-center">
        <div className="flex flex-col text-sm font-medium text-foreground text-wrap max-w-28">
          <div>
            {employee.firstName} {employee.familyName}
          </div>
        </div>
      </td>
      <td className="px-1 py-1 whitespace-nowrap justify-items-center">
        <div className="flex flex-col text-sm font-medium text-foreground truncate max-w-28">
          <div>{employee.email}</div>
          <div>{employee.tel}</div>
        </div>
      </td>
      <td className="px-1 py-1 whitespace-nowrap justify-items-center text-sm font-medium">
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
