import { Employee, EmployeeStatus } from '@/app/types/dataTypes';

/**
 * Normalize a name by capitalizing the first letter of each part
 * separated by spaces or dashes
 * @param name Name to normalize
 * @returns Normalized name
 */
export const normalizeName = function (name: string) {
  // Handle names with spaces or dashes by capitalizing each part
  return name
    .trim()
    .split(/[ -]/)
    .filter(Boolean)
    .map(part => (part.charAt(0).toUpperCase() + part.slice(1)).trim())
    .join(name.includes('-') ? '-' : ' ');
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
