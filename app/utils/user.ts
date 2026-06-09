import { Conciergerie, Employee } from '@/app/types/dataTypes';

export type UserData = Conciergerie | Employee;

/**
 * Check if a user is an employee
 */
export const isEmployee = <T extends UserData>(user: T): boolean => 'firstName' in user && 'familyName' in user;

/**
 * Get a unique key for a user (used for lookups and maps)
 * For conciergeries: returns the name
 * For employees: returns "firstName familyName"
 */
export const getUserKey = <T extends UserData>(user: T): string => {
  if ('name' in user) return user.name;
  if ('firstName' in user && 'familyName' in user) return `${user.firstName} ${user.familyName}`;
  throw new Error('Invalid UserData type');
};
