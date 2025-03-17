import { Employee, EmployeeStatus, Mission } from '../types/types';

// Get all employees from localStorage
export function getEmployees(): Employee[] {
  try {
    const employeesStr = localStorage.getItem('employees_list');
    if (employeesStr) {
      return JSON.parse(employeesStr) as Employee[];
    }
  } catch (error) {
    console.error('Error getting employees:', error);
  }
  return [];
}

// Save employees to localStorage
export function saveEmployees(employees: Employee[]): void {
  try {
    localStorage.setItem('employees_list', JSON.stringify(employees));
  } catch (error) {
    console.error('Error saving employees:', error);
  }
}

// Find an employee by matching name, email, or phone
export function findEmployee(employee: Employee, existingEmployees?: Employee[]): Employee | undefined {
  const employees = existingEmployees || getEmployees();

  // Check if employee exists with the same name, email, or phone
  return employees.find(
    emp =>
      (emp.firstName.toLowerCase() === employee.firstName.toLowerCase() &&
        emp.familyName.toLowerCase() === employee.familyName.toLowerCase()) ||
      emp.email.toLowerCase() === employee.email.toLowerCase() ||
      (emp.tel && employee.tel && emp.tel === employee.tel),
  );
}

// Check if employee already exists
export function employeeExists(employee: Employee, existingEmployees?: Employee[]): boolean {
  return !!findEmployee(employee, existingEmployees);
}

// Add a new employee
export function addEmployee(employee: Employee): void {
  const employees = getEmployees();

  // Check if employee already exists
  if (employeeExists(employee, employees)) return;

  // Create a new employee with status
  const newEmployee: Employee = {
    ...employee,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  employees.push(newEmployee);
  saveEmployees(employees);
}

// Update an employee's status
export function updateEmployeeStatus(id: string, status: EmployeeStatus): void {
  try {
    const employees = getEmployees();
    const updatedEmployees = employees.map(emp => {
      if (emp.id === id) {
        // If status is changing from pending to accepted/rejected, remove the message and conciergerie
        if (emp.status === 'pending' && (status === 'accepted' || status === 'rejected')) {
          const { message, conciergerieName, ...acceptedEmployee } = emp; // eslint-disable-line @typescript-eslint/no-unused-vars
          return { ...acceptedEmployee, status };
        }
        // Otherwise just update the status
        return { ...emp, status };
      }
      return emp;
    }) as Employee[];

    saveEmployees(updatedEmployees);

    // Update mission assignments if status changed to rejected
    if (status === 'rejected') {
      try {
        // Get missions from localStorage
        const missionsData = localStorage.getItem('missions');
        if (missionsData) {
          const missions = JSON.parse(missionsData);

          // Check if any missions are assigned to this employee
          let missionsUpdated = false;
          const updatedMissions = missions.map((mission: Mission) => {
            if (mission.employeeId === id) {
              missionsUpdated = true;
              return { ...mission, assignedTo: null };
            }
            return mission;
          });

          // Save updated missions if any were changed
          if (missionsUpdated) {
            localStorage.setItem('missions', JSON.stringify(updatedMissions));
          }
        }
      } catch (error) {
        console.error('Error parsing employee data from localStorage:', error);
      }
    }
  } catch (error) {
    console.error('Error updating employee status:', error);
  }
}

// Delete an employee
export function deleteEmployee(id: string): void {
  const employees = getEmployees();
  const filteredEmployees = employees.filter(emp => emp.id !== id);
  saveEmployees(filteredEmployees);
}

// Sort employees by status (pending first, then accepted, then rejected)
// and then alphabetically by name
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

// Filter employees by search term
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

// Filter employees by conciergerie
export function filterEmployeesByConciergerie(employees: Employee[], conciergerieName: string | null): Employee[] {
  if (!conciergerieName) return [];

  return employees.filter(
    employee =>
      !employee.conciergerieName || employee.conciergerieName.toLowerCase() === conciergerieName.toLowerCase(),
  );
}

// Get employee status by matching name, email, or phone
export function getEmployeeStatus(employee: Employee): EmployeeStatus | null {
  const existingEmployee = findEmployee(employee);
  return existingEmployee ? existingEmployee.status : null;
}
