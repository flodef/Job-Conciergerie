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

// Check if employee already exists
export function employeeExists(employee: EmployeeData, existingEmployees?: EmployeeWithStatus[]): boolean {
  const employees = existingEmployees || getEmployees();
  
  // Check if employee already exists with the same name, email, or phone
  const existingEmployee = employees.find(
    emp => 
      ((emp.nom.toLowerCase() === employee.nom.toLowerCase()) && 
       (emp.prenom.toLowerCase() === employee.prenom.toLowerCase())) ||
      (emp.email.toLowerCase() === employee.email.toLowerCase()) ||
      (emp.tel && employee.tel && emp.tel === employee.tel)
  );
  
  return !!existingEmployee;
}

// Add a new employee
export function addEmployee(employee: EmployeeData): void {
  const employees = getEmployees();
  
  // Check if employee already exists
  if (employeeExists(employee, employees)) {
    console.log('Employee already exists, not adding again');
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
  console.log('New employee added:', newEmployee);
}

// Update an employee's status
export function updateEmployeeStatus(id: string, status: EmployeeStatus): void {
  try {
    const employees = getEmployees();
    const updatedEmployees = employees.map(emp => {
      if (emp.id === id) {
        // If status is changing from pending to accepted/rejected, remove the message
        if (emp.status === 'pending' && (status === 'accepted' || status === 'rejected')) {
          const { message, ...employeeWithoutMessage } = emp;
          return { ...employeeWithoutMessage, status };
        }
        // Otherwise just update the status
        return { ...emp, status };
      }
      return emp;
    });
    
    saveEmployees(updatedEmployees);
    console.log(`Employee ${id} status updated to ${status}`);
    
    // Update mission assignments if status changed to rejected
    if (status === 'rejected') {
      try {
        // Get missions from localStorage
        const missionsData = localStorage.getItem('missions');
        if (missionsData) {
          const missions = JSON.parse(missionsData);
          
          // Check if any missions are assigned to this employee
          let missionsUpdated = false;
          const updatedMissions = missions.map((mission: any) => {
            if (mission.assignedTo === id) {
              missionsUpdated = true;
              return { ...mission, assignedTo: null };
            }
            return mission;
          });
          
          // Save updated missions if any were changed
          if (missionsUpdated) {
            localStorage.setItem('missions', JSON.stringify(updatedMissions));
            console.log(`Unassigned missions from rejected employee ${id}`);
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

// Update employee data in localStorage
export function updateEmployeeData(employeeData: EmployeeData): void {
  try {
    // Get the current employee data
    const currentDataStr = localStorage.getItem('employee_data');
    const currentData = currentDataStr ? JSON.parse(currentDataStr) : null;
    
    // If there's existing data, merge it with the new data
    const updatedData = currentData 
      ? { ...currentData, ...employeeData }
      : employeeData;
    
    // Save the updated data
    localStorage.setItem('employee_data', JSON.stringify(updatedData));
    
    console.log('Updated employee data in localStorage:', updatedData);
  } catch (error) {
    console.error('Error updating employee data:', error);
  }
}

// Get employee status by matching name, email, or phone
export function getEmployeeStatus(employee: EmployeeData): EmployeeStatus | null {
  const employees = getEmployees();
  
  // Find the employee
  const existingEmployee = employees.find(
    emp => 
      ((emp.nom.toLowerCase() === employee.nom.toLowerCase()) && 
       (emp.prenom.toLowerCase() === employee.prenom.toLowerCase())) ||
      (emp.email.toLowerCase() === employee.email.toLowerCase()) ||
      (emp.tel && employee.tel && emp.tel === employee.tel)
  );
  
  return existingEmployee ? existingEmployee.status : null;
}
