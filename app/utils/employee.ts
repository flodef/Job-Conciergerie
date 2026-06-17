import { updateEmployeeStatusAction } from '@/app/actions/employee';
import { updateMissionData } from '@/app/actions/mission';
import type { Conciergerie, Employee, EmployeeStatus, Mission, MissionStatus } from '@/app/types/dataTypes';
import { EmailSender } from '@/app/utils/emailSender';
import { isPartOfMission } from './missionFilters';
import { getUserKey } from './user';

/**
 * Get the full name of an employee
 * @param employee Employee
 * @param isShort Whether to return the short name (first letter of first name + last name)
 * @returns Full name
 */
export const getEmployeeFullName = (employee: Employee, isShort = false) =>
  isShort ? `${employee.firstName[0]}. ${employee.familyName}` : `${employee.firstName} ${employee.familyName}`;

/**
 * Normalize a first name:
 * - Everything lowercase except first letter
 * - Spaces replaced with hyphens
 * - After hyphens, next letter is uppercase
 * @param firstName First name to normalize
 * @returns Normalized first name
 */
export const normalizeFirstName = function (firstName: string) {
  return firstName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
};

/**
 * Normalize a family name:
 * - Everything lowercase except first letter
 * - Spaces and hyphens are kept
 * - After hyphens or spaces, next letter is uppercase
 * @param familyName Family name to normalize
 * @returns Normalized family name
 */
export const normalizeFamilyName = function (familyName: string) {
  return familyName
    .trim()
    .toLowerCase()
    .split(/[ -]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(familyName.includes('-') ? '-' : ' ');
};

/**
 * Sort employees by status (pending first, then accepted, then rejected)
 * and then alphabetically by name
 * @param employees All employees
 * @returns Sorted employees
 */
export function sortEmployees(employees: Employee[]): Employee[] {
  const statusOrder: Record<EmployeeStatus, number> = {
    pending: 0,
    accepted: 1,
    rejected: 2,
    deleted: 3,
  };

  return [...employees].sort((a, b) => {
    // First sort by status
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }

    // Then sort alphabetically by last name
    const lastNameA = a.familyName?.toLowerCase() || '';
    const lastNameB = b.familyName?.toLowerCase() || '';

    if (lastNameA !== lastNameB) {
      return lastNameA.localeCompare(lastNameB);
    }

    // If last names are the same, sort by first name
    return (a.firstName?.toLowerCase() || '').localeCompare(b.firstName?.toLowerCase() || '');
  });
}

/**
 * Filter employees by search term
 * @param employees All employees
 * @param searchTerm Search term
 * @returns Filtered employees
 */
export function filterEmployees(employees: Employee[], searchTerm: string): Employee[] {
  if (!searchTerm.trim()) {
    return employees;
  }

  const term = searchTerm.toLowerCase();

  return employees.filter(
    emp =>
      emp.firstName?.toLowerCase().includes(term) ||
      emp.familyName?.toLowerCase().includes(term) ||
      emp.email?.toLowerCase().includes(term),
  );
}

/**
 * Filter employees by conciergerie
 * @param employees All employees
 * @param conciergerieName Conciergerie name to filter by
 * @returns Filtered employees
 */
export function filterEmployeesByConciergerie(employees: Employee[], conciergerieName: string | null): Employee[] {
  if (!conciergerieName) return [];

  return employees.filter(
    employee =>
      !employee.conciergerieName || employee.conciergerieName?.toLowerCase() === conciergerieName?.toLowerCase(),
  );
}

/**
 * Count missions assigned to an employee
 * @param employee Employee to count missions for
 * @param missions All missions
 * @param status Optional mission status to filter by. If not specified, counts all missions.
 * @returns Number of missions assigned to the employee
 */
export const countEmployeeMissions = (employee: Employee, missions: Mission[], status?: MissionStatus): number => {
  const employeeId = getUserKey(employee);
  return employeeId
    ? missions.filter(mission => mission.employeeId === employeeId && (!status || mission.status === status)).length
    : 0;
};

/**
 * Remove employee from all their assigned missions
 * @param employee Employee to remove
 * @param missions All missions
 * @param employees All employees
 */
export const removeEmployeeFromMissions = async (employee: Employee, missions: Mission[], employees: Employee[]) => {
  const employeeKey = getUserKey(employee);
  const missionsToUpdate = missions.filter(
    mission => isPartOfMission(mission, employeeKey) && mission.status !== 'completed',
  );

  for (const mission of missionsToUpdate) {
    let updatedMission: Partial<Mission> = { ...mission, modifiedDate: new Date() };

    if (mission.employeeId === employeeKey) {
      // Employee is primary
      if (mission.employeeId2) {
        // Duo mission - check if secondary is an employee or conciergerie
        const isEmployee2 = employees.some(emp => getUserKey(emp) === mission.employeeId2);
        if (!isEmployee2) {
          // Secondary is a conciergerie, remove both and set status to null
          updatedMission = { ...updatedMission, employeeId: null, employeeId2: null, status: null };
        } else {
          // Secondary is an employee, promote to primary
          updatedMission = { ...updatedMission, employeeId: mission.employeeId2, employeeId2: null };
        }
      } else {
        // Non-duo mission, set status to null
        updatedMission = { ...updatedMission, employeeId: null, status: null };
      }
    } else if (mission.employeeId2 === employeeKey) {
      // Employee is secondary in duo mission, set status to null
      updatedMission = { ...updatedMission, employeeId2: null, status: null };
    }

    await updateMissionData(mission.id, updatedMission);
  }
};

/**
 * Update employee status
 * @param employee Employee to update
 * @param newStatus New status to set
 * @param userData Current user data
 * @param missions All missions
 * @param employees All employees
 * @param updateUserData Function to update user data
 */
export const updateEmployeeStatus = async (
  employee: Employee,
  newStatus: 'accepted' | 'rejected',
  userData: Conciergerie | Employee | undefined,
  missions: Mission[],
  employees: Employee[],
  updateUserData: (data: Employee, type: 'employee') => void,
) => {
  const updatedEmployee = await updateEmployeeStatusAction(employee, newStatus);
  if (!updatedEmployee) throw new Error("Le prestataire à modifier n'a pas été trouvé");
  updateUserData(updatedEmployee, 'employee');
  const conciergerie = userData as Conciergerie;
  if (!conciergerie) throw new Error('Conciergerie non trouvée');

  // Remove employee from missions if rejected
  if (newStatus === 'rejected') {
    await removeEmployeeFromMissions(employee, missions, employees);
  }

  const emailSent = await EmailSender.sendAcceptanceEmail(
    employee,
    conciergerie,
    countEmployeeMissions(employee, missions),
    newStatus === 'accepted',
  );
  return { updatedEmployee, emailSent };
};

/**
 * Handle employee status change
 * @param employee Employee to update
 * @param newStatus New status to set
 * @param userData Current user data
 * @param missions All missions
 * @param employees All employees
 * @param updateUserData Function to update user data
 * @returns Success message to display in toast
 */
export const handleEmployeeStatusChange = async (
  employee: Employee,
  newStatus: 'accepted' | 'rejected',
  userData: Conciergerie | Employee | undefined,
  missions: Mission[],
  employees: Employee[],
  updateUserData: (data: Employee, type: 'employee') => void,
): Promise<string> => {
  const { updatedEmployee, emailSent } = await updateEmployeeStatus(
    employee,
    newStatus,
    userData,
    missions,
    employees,
    updateUserData,
  );
  return `${getEmployeeFullName(updatedEmployee)} a été ${
    newStatus === 'accepted' ? 'accepté' : 'rejeté'
  }${emailSent ? '. Le prestataire a été notifié par email.' : '.'}`;
};

/**
 * Get confirmation modal configuration for employee status change
 * @param employee Employee to update
 * @param newStatus New status to set
 * @param missions All missions
 * @returns Modal configuration object or null if no confirmation needed
 */
export const getEmployeeStatusChangeConfirmation = (
  employee: Employee,
  newStatus: 'accepted' | 'rejected',
  missions: Mission[],
): { title: string; message: string; confirmText: string; cancelText?: string; isDangerous?: boolean } | null => {
  if (newStatus === 'rejected') {
    const acceptedCount = countEmployeeMissions(employee, missions, 'accepted');
    const startedCount = countEmployeeMissions(employee, missions, 'started');
    return {
      title: 'Rejeter le prestataire',
      message: `Vous êtes sur le point de rejeter ${getEmployeeFullName(employee)}.${
        acceptedCount > 0 ? `\nCe prestataire sera retiré de ses ${acceptedCount} mission(s).` : ''
      }${startedCount > 0 ? '\n⚠️ Cet employé a une mission en cours. Si vous continuez, celle-ci sera interrompue.' : ''}\n\nIl ne pourra plus accéder à l'application.`,
      confirmText: 'Rejeter',
      cancelText: 'Annuler',
      isDangerous: true,
    };
  } else if (newStatus === 'accepted' && employee.status === 'rejected') {
    return {
      title: 'Accepter le prestataire',
      message: `Vous êtes sur le point d'accepter ${getEmployeeFullName(employee)} qui était précédemment rejeté. Ce prestataire pourra à nouveau accéder à l'application.`,
      confirmText: 'Accepter',
      cancelText: 'Annuler',
    };
  }
  return null;
};
