export interface Conciergerie {
  id: string;
  name: string;
  color: string;
  colorName: string;
  email: string;
  tel: string;
  notificationSettings?: ConciergerieNotificationSettings;
}
export interface ConciergerieNotificationSettings {
  acceptedMissions: boolean;
  startedMissions: boolean;
  completedMissions: boolean;
  missionsEndedWithoutStart: boolean;
}

export type EmployeeStatus = 'pending' | 'accepted' | 'rejected';
export interface Employee {
  id: string;
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
export interface EmployeeNotificationSettings {
  acceptedMissions: boolean;
  missionChanged: boolean;
  missionDeleted: boolean;
  missionsCanceled: boolean;
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
export interface Mission {
  id: string;
  homeId: string; // Reference to the home by ID
  tasks: Task[];
  startDateTime: Date;
  endDateTime: Date;
  employeeId?: string; // ID of the employee assigned to this mission
  modifiedDate: Date;
  conciergerieName: string; // Reference to the conciergerie by name
  status?: MissionStatus; // Default is 'pending' if not specified
  allowedEmployees?: string[]; // List of prestataire IDs who can see this mission, empty or undefined means all
  hours: number; // Total hours for the mission based on tasks and home specifications
}
