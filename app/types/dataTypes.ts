import type { ConciergerieNotificationSettings, EmployeeNotificationSettings } from '@/app/utils/notifications';

export interface Conciergerie {
  id: string[];
  name: string;
  color: string;
  colorName: string;
  email: string;
  tel: string;
  notificationSettings?: ConciergerieNotificationSettings;
}

export type EmployeeStatus = 'pending' | 'accepted' | 'rejected';
export interface Employee {
  id: string[];
  firstName: string;
  familyName: string;
  tel: string;
  email: string;
  geographicZone: string; // Geographic zone where the employee is located
  conciergerieName?: string;
  message?: string;
  notificationSettings?: EmployeeNotificationSettings;
  status: EmployeeStatus;
  createdAt: string;
}

export interface Home {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  images: string[]; // URLs to images
  geographicZone: string; // Geographic zone where the home is located
  hoursOfCleaning: number; // Hours of cleaning required
  hoursOfGardening: number; // Hours of gardening required
  conciergerieName: string; // Reference to the conciergerie by name
  allowDuo: boolean; // Whether missions on this home can be done by a duo (2 providers)
  maxTravellers: number; // Maximum number of travellers allowed for missions on this home
  notes?: string; // Optional notes about the home
}

export enum Task {
  Cleaning = 'Ménage',
  Gardening = 'Jardinage',
  Arrival = 'Arrivée',
  Departure = 'Départ',
}
export interface MissionPoints {
  totalPoints: number;
  pointsPerDay: number;
}
export type MissionStatus = 'accepted' | 'started' | 'completed';
export type MissionSortField = 'date' | 'conciergerie' | 'geographicZone' | 'homeTitle';

export interface MissionReport {
  id: string;
  missionId: string; // Reference to the mission this report belongs to
  employeeId: string; // ID of the employee who wrote the report
  content: string; // Free text report (max 500 characters)
  images: string[]; // Storage file paths for report photos (max 3)
  createdAt: Date;
}
export interface Mission {
  id: string;
  homeId: string; // Reference to the home by ID
  tasks: Task[];
  startDateTime: Date;
  endDateTime: Date;
  employeeId: string | null; // ID of the employee assigned to this mission
  employeeId2?: string | null; // ID of the second binôme member (employee or conciergerie name), null if none
  modifiedDate: Date;
  conciergerieName: string; // Reference to the conciergerie by name
  status: MissionStatus | null; // Default is 'pending' if not specified
  allowedEmployees?: string[] | null; // List of prestataire IDs who can see this mission, empty or undefined means all
  hours: number; // Total hours for the mission based on tasks and home specifications
  allowDuo: boolean; // Whether this mission can be done by a duo (2 providers) - copied from home at creation
  travellers: number; // Number of travellers for this mission
  conciergerieComment?: string | null; // Free text comment from conciergerie about the mission
}
