import { Employee, EmployeeStatus } from '@/app/types/dataTypes';

/**
 * Check if an employee with the same name, phone number, or email already exists
 * @param employees All employees
 * @param firstName First name to check
 * @param familyName Family name to check
 * @param tel Phone number to check
 * @param email Email to check
 * @returns Boolean indicating if an employee with the same name, phone number, or email already exists
 */
export function employeeExists(
  employees: Employee[],
  firstName: string,
  familyName: string,
  tel: string,
  email: string,
): boolean {
  return employees.some(
    employee =>
      (employee.firstName === firstName && employee.familyName === familyName) ||
      employee.tel === tel ||
      employee.email === email,
  );
}

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
  return employee.id.filter(id => !id.startsWith('$'));
}

/**
 * Check if an employee has reached the maximum number of device IDs allowed
 * @param employees All employees
 * @param firstName First name to check
 * @param familyName Family name to check
 * @returns Object with boolean 'hasReachedLimit' and the matched employee if found
 */
export function employeeReachedIdLimit(
  employees: Employee[],
  firstName: string,
  familyName: string,
): { hasReachedLimit: boolean; employee: Employee | null } {
  // Find the employee that matches the criteria
  const matchedEmployee = employees.find(
    employee =>
      employee.firstName.toLowerCase() === firstName.toLowerCase() &&
      employee.familyName.toLowerCase() === familyName.toLowerCase(),
  );
  if (!matchedEmployee) return { hasReachedLimit: false, employee: null };

  // Count only active device IDs (without $ prefix)
  const connectedDeviceCount = getConnectedDevices(matchedEmployee).length;
  const maxDevices = parseInt(process.env.NEXT_PUBLIC_MAX_DEVICES || '3');

  // Check if the employee has reached the maximum number of active device IDs allowed
  return {
    hasReachedLimit: connectedDeviceCount >= maxDevices,
    employee: matchedEmployee,
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
