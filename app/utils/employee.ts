import { updateEmployeeStatusAction } from '@/app/actions/employee';
import { updateMissionData } from '@/app/actions/mission';
import type { Conciergerie, Employee, EmployeeStatus, Mission } from '@/app/types/dataTypes';
import { EmailSender } from '@/app/utils/emailSender';
import { getUserKey } from './user';
import { isPartOfMission } from './missionFilters';

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

// Count missions assigned to an employee
export const countEmployeeMissions = (employee: Employee, missions: Mission[]): number =>
  missions.filter(mission => getUserKey(employee) === mission.employeeId).length;

// Remove employee from all their assigned missions
export const removeEmployeeFromMissions = async (employee: Employee, missions: Mission[], employees: Employee[]) => {
  const employeeKey = getUserKey(employee);
  const missionsToUpdate = missions.filter(mission => isPartOfMission(mission, employeeKey));

  for (const mission of missionsToUpdate) {
    // Don't remove from completed missions (for archive purposes)
    if (mission.status === 'completed') continue;

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

// Update employee status
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
