import { Employee, EmployeeStatus } from '@/app/types/dataTypes';
import { isNewDevice } from '@/app/utils/id';

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
    const lastNameA = a.familyName.toLowerCase();
    const lastNameB = b.familyName.toLowerCase();

    if (lastNameA !== lastNameB) {
      return lastNameA.localeCompare(lastNameB);
    }

    // If last names are the same, sort by first name
    return a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase());
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
      emp.firstName.toLowerCase().includes(term) ||
      emp.familyName.toLowerCase().includes(term) ||
      emp.email.toLowerCase().includes(term),
  );
}

/**
 * Get the list of connected devices for an employee
 * @param employee Employee to get connected devices for
 * @returns List of connected devices
 */
export function getConnectedDevices(employee: Employee): string[] {
  return employee.id.filter(id => !isNewDevice(id));
}

/**
 * Check if an employee has reached the maximum number of device IDs allowed
 * @param employees All employees
 * @param firstName First name to check
 * @param familyName Family name to check
 * @returns Object with boolean 'hasReachedLimit' and the matched employee if found
 */
export function employeeConnectedDevices(
  employees: Employee[],
  firstName: string,
  familyName: string,
): { employee: Employee | undefined; connectedDeviceCount: number } {
  // Find the employee that matches the criteria
  const employee = employees.find(
    employee =>
      employee.firstName.toLowerCase() === firstName.toLowerCase() &&
      employee.familyName.toLowerCase() === familyName.toLowerCase(),
  );

  // Count only active device IDs (without new devices)
  const connectedDeviceCount = employee ? getConnectedDevices(employee).length : 0;

  return {
    employee,
    connectedDeviceCount,
  };
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
      !employee.conciergerieName || employee.conciergerieName.toLowerCase() === conciergerieName.toLowerCase(),
  );
}
