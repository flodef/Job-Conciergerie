export enum Objective {
  Entry = 'Entrée',
  Exit = 'Sortie',
  Cleaning = 'Nettoyage',
  Gardening = 'Jardinage',
}

export const objectives = Object.values(Objective);

export interface Home {
  id: string;
  title: string;
}

export interface Employee {
  id: string;
  name: string;
}

export interface Conciergerie {
  name: string;
  color: string;
  colorName: string;
  email: string;
  tel?: string;
}

export interface Mission {
  id: string;
  homeId: string;
  home: Home;
  objectives: Objective[];
  date: Date;
  employeeId?: string;
  employee?: Employee;
  modifiedDate: Date;
  deleted: boolean;
  conciergerie: Conciergerie; // The conciergerie that created the mission
}
