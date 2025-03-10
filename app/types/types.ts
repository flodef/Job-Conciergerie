export interface Objective {
  label: string;
  points: number;
}

export interface Home {
  id: string;
  title: string;
  description: string;
  tasks: string[];
  images?: string[]; // URLs to images
}

export interface HomeData extends Home {
  modifiedDate: Date;
  deleted: boolean;
  conciergerieName: string; // Reference to the conciergerie by name
}

export type EmployeeStatus = 'pending' | 'accepted' | 'rejected';
export interface Employee {
  id: string;
  firstName: string;
  familyName: string;
  tel: string;
  email: string;
  conciergerieName?: string;
  message?: string;
}

export interface EmployeeWithStatus extends Employee {
  status: EmployeeStatus;
  createdAt: string;
}

export interface Conciergerie {
  name: string;
  color: string;
  colorName: string;
  email: string;
  tel: string;
}

export type MissionStatus = 'pending' | 'started' | 'completed';

export interface Mission {
  id: string;
  homeId: string; // Reference to the home by ID
  objectives: Objective[];
  startDateTime: Date;
  endDateTime: Date;
  employeeId?: string;
  modifiedDate: Date;
  deleted: boolean;
  conciergerieName: string; // Reference to the conciergerie by name
  status?: MissionStatus; // Default is 'pending' if not specified
}

export interface MissionPoints {
  totalPoints: number;
  pointsPerDay: number;
}
