import { EmployeeData } from "../components/employeeForm";

export type EmployeeStatus = 'pending' | 'accepted' | 'rejected';

export interface EmployeeWithStatus extends EmployeeData {
  id: string;
  status: EmployeeStatus;
  createdAt: string;
}

// Get all employees from localStorage
export function getEmployees(): EmployeeWithStatus[] {
  try {
    const employeesStr = localStorage.getItem('employees_list');
    if (employeesStr) {
      return JSON.parse(employeesStr) as EmployeeWithStatus[];
    }
  } catch (error) {
    console.error('Error getting employees:', error);
  }
  return [];
}

// Save employees to localStorage
export function saveEmployees(employees: EmployeeWithStatus[]): void {
  try {
    localStorage.setItem('employees_list', JSON.stringify(employees));
  } catch (error) {
    console.error('Error saving employees:', error);
  }
}

// Add a new employee
export function addEmployee(employee: EmployeeData): void {
  const employees = getEmployees();
  
  // Check if employee already exists with the same name, email, or phone
  const existingEmployee = employees.find(
    emp => 
      ((emp.nom.toLowerCase() === employee.nom.toLowerCase()) && 
       (emp.prenom.toLowerCase() === employee.prenom.toLowerCase())) ||
      (emp.email.toLowerCase() === employee.email.toLowerCase()) ||
      (emp.tel && employee.tel && emp.tel === employee.tel)
  );
  
  // If employee exists and is already accepted or rejected, don't add them again
  if (existingEmployee && (existingEmployee.status === 'accepted' || existingEmployee.status === 'rejected')) {
    return;
  }
  
  // Create a new employee with status
  const newEmployee: EmployeeWithStatus = {
    ...employee,
    id: generateId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  employees.push(newEmployee);
  saveEmployees(employees);
}

// Update an employee's status
export function updateEmployeeStatus(id: string, status: EmployeeStatus): void {
  const employees = getEmployees();
  const index = employees.findIndex(emp => emp.id === id);
  
  if (index !== -1) {
    employees[index].status = status;
    saveEmployees(employees);
    
    // If the employee is accepted or rejected, remove their message from localStorage
    if (status === 'accepted' || status === 'rejected') {
      // Get the employee data
      const employeeData = employees[index];
      
      // Check if the employee data in localStorage matches this employee
      const storedEmployeeDataStr = localStorage.getItem('employee_data');
      if (storedEmployeeDataStr) {
        try {
          const storedEmployeeData = JSON.parse(storedEmployeeDataStr);
          
          // Check if the stored employee data matches this employee
          if (
            (storedEmployeeData.email === employeeData.email) ||
            (storedEmployeeData.tel === employeeData.tel) ||
            (storedEmployeeData.nom === employeeData.nom && storedEmployeeData.prenom === employeeData.prenom)
          ) {
            // Remove the message from localStorage
            storedEmployeeData.message = '';
            localStorage.setItem('employee_data', JSON.stringify(storedEmployeeData));
          }
        } catch (error) {
          console.error('Error parsing employee data from localStorage:', error);
        }
      }
    }
  }
}

// Delete an employee
export function deleteEmployee(id: string): void {
  const employees = getEmployees();
  const filteredEmployees = employees.filter(emp => emp.id !== id);
  saveEmployees(filteredEmployees);
}

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Sort employees by status (pending first, then accepted, then rejected)
// and then alphabetically by name
export function sortEmployees(employees: EmployeeWithStatus[]): EmployeeWithStatus[] {
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
    const lastNameA = a.nom.toLowerCase();
    const lastNameB = b.nom.toLowerCase();
    
    if (lastNameA !== lastNameB) {
      return lastNameA.localeCompare(lastNameB);
    }
    
    // If last names are the same, sort by first name
    return a.prenom.toLowerCase().localeCompare(b.prenom.toLowerCase());
  });
}

// Filter employees by search term
export function filterEmployees(
  employees: EmployeeWithStatus[], 
  searchTerm: string
): EmployeeWithStatus[] {
  if (!searchTerm.trim()) {
    return employees;
  }
  
  const term = searchTerm.toLowerCase();
  
  return employees.filter(emp => 
    emp.nom.toLowerCase().includes(term) || 
    emp.prenom.toLowerCase().includes(term) ||
    emp.email.toLowerCase().includes(term) ||
    emp.conciergerie.toLowerCase().includes(term)
  );
}

// Filter employees by conciergerie
export function filterEmployeesByConciergerie(
  employees: EmployeeWithStatus[],
  conciergerie: string | null
): EmployeeWithStatus[] {
  if (!conciergerie) return [];
  
  return employees.filter(employee => 
    employee.conciergerie.toLowerCase() === conciergerie.toLowerCase()
  );
}
