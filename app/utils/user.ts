import type { Conciergerie, Employee, Home, Mission } from '@/app/types/dataTypes';

export type UserData = Conciergerie | Employee;

/**
 * Check if a user is an employee
 *
 * @param user - The user to check
 * @returns True if the user is an employee, false otherwise
 */
export const isEmployeeUser = <T extends UserData>(user: T): boolean => 'firstName' in user && 'familyName' in user;

/**
 * Check if a user is a conciergerie
 *
 * @param user - The user to check
 * @returns True if the user is a conciergerie, false otherwise
 */
export const isConciergerieUser = <T extends UserData>(user: T): boolean => 'name' in user;

/**
 * Get a unique key for a user (used for lookups and maps)
 * For conciergeries: returns the name
 * For employees: returns "firstName familyName"
 *
 * @param user - The user to get the key for
 * @returns The unique key for the user
 */
export const getUserKey = <T extends UserData>(user: T): string => {
  if ('name' in user) return user.name;
  if ('firstName' in user && 'familyName' in user) return `${user.firstName} ${user.familyName}`;
  throw new Error('Invalid UserData type');
};

/**
 * Check if a user is the owner of a mission or home
 *
 * @param user - The user to check
 * @param entity - The mission or home to check
 * @returns True if the user is the owner, false otherwise
 */
export const isOwner = (user: UserData | undefined, entity: Mission | Home) =>
  user && isConciergerieUser(user) && (user as Conciergerie).name === entity.conciergerieName;
