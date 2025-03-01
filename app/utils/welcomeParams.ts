/**
 * Get all welcome page parameters from localStorage
 */
export function getWelcomeParams() {
  if (typeof window === 'undefined') {
    return {
      userType: null,
      employeeData: null,
      conciergerieData: null,
    };
  }

  try {
    // Get user type
    const userTypeStr = localStorage.getItem('user_type');
    const userType = userTypeStr ? JSON.parse(userTypeStr) : null;

    // Get employee data if available
    const employeeDataStr = localStorage.getItem('employee_data');
    const employeeData = employeeDataStr ? JSON.parse(employeeDataStr) : null;

    // Get conciergerie data if available
    const conciergerieDataStr = localStorage.getItem('conciergerie_data');
    const conciergerieData = conciergerieDataStr ? JSON.parse(conciergerieDataStr) : null;

    return {
      userType,
      employeeData,
      conciergerieData,
    };
  } catch (error) {
    console.error('Error retrieving welcome params from localStorage:', error);
    return {
      userType: null,
      employeeData: null,
      conciergerieData: null,
    };
  }
}

/**
 * Check if user has completed the welcome flow
 */
export function hasCompletedWelcomeFlow(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const { userType, employeeData, conciergerieData } = getWelcomeParams();

    // User has completed welcome flow if:
    // 1. They've selected a user type AND
    // 2a. If they're a prestataire, they've filled out employee data OR
    // 2b. If they're a conciergerie, they've selected a conciergerie name

    if (!userType) return false;

    if (userType === 'prestataire') {
      return (
        !!employeeData && !!employeeData.nom && !!employeeData.prenom && !!employeeData.email && !!employeeData.tel
      );
    }

    if (userType === 'conciergerie') {
      return !!conciergerieData && !!conciergerieData.name;
    }

    return false;
  } catch (error) {
    console.error('Error checking welcome flow completion:', error);
    return false;
  }
}

/**
 * Clear all welcome page parameters from localStorage
 */
export function clearWelcomeParams(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('user_type');
    localStorage.removeItem('employee_data');
    localStorage.removeItem('conciergerie_data');
  } catch (error) {
    console.error('Error clearing welcome params from localStorage:', error);
  }
}
