import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import type { Mission } from '@/app/types/dataTypes';
import { Task } from '@/app/types/dataTypes';
import { getMissionHoursPerProvider, getMissionProviderCount } from '@/app/utils/task';
import { createNewMission, updateMissionData } from '@/app/actions/mission';
import { createHome } from '@/app/db/homeDb';
import { deleteMission } from '@/app/db/missionDb';
import { sql } from '@/app/db/db';

const TEST_HOME_ID = 'test-home-hours-fix';
const TEST_MISSION_ID = 'test-mission-hours-fix';
const TEST_CONCIERGERIE = 'MENTHEREGLISSE';

describe.skipIf(!process.env.DATABASE_URL)('Mission Actions - conciergerieComment field', () => {
  beforeAll(async () => {
    // Debug: log DATABASE_URL
    console.log('DATABASE_URL in test:', process.env.DATABASE_URL?.substring(0, 60));

    // Create a test home (required FK for missions)
    await createHome({
      id: TEST_HOME_ID,
      title: 'Test Home',
      description: 'Test home for hours type fix',
      objectives: [],
      images: [],
      geographic_zone: 'Test Zone',
      hours_of_cleaning: 2,
      hours_of_gardening: 0,
      conciergerie_name: TEST_CONCIERGERIE,
      allow_duo: true,
      max_travellers: 4,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await deleteMission(TEST_MISSION_ID);
    await deleteMission(TEST_MISSION_ID + '-str');
    await deleteMission(TEST_MISSION_ID + '-comment');
    await deleteMission(TEST_MISSION_ID + '-no-comment');
    await sql`DELETE FROM homes WHERE id = ${TEST_HOME_ID}`;
    // Close database connection to free up pool
    await sql.end();
  });

  const baseMission: Omit<Mission, 'modifiedDate'> = {
    id: TEST_MISSION_ID,
    homeId: TEST_HOME_ID,
    tasks: [Task.Cleaning],
    startDateTime: new Date('2026-06-01T10:00:00Z'),
    endDateTime: new Date('2026-06-01T12:00:00Z'),
    employeeId: null,
    conciergerieName: TEST_CONCIERGERIE,
    status: null,
    allowedEmployees: null,
    hours: 2,
    allowDuo: true,
    travellers: 2,
    conciergerieComment: undefined,
  };

  describe('Mission Actions - hours type conversion', () => {
    test('createNewMission stores hours as numeric and returns number', async () => {
      const result = await createNewMission({ ...baseMission, modifiedDate: new Date(), hours: 2 });

      expect(result).not.toBeNull();
      expect(result?.hours).toBe(2);
      expect(typeof result?.hours).toBe('number');
    });

    test('createNewMission converts string hours to numeric in DB', async () => {
      const result = await createNewMission({
        ...baseMission,
        id: TEST_MISSION_ID + '-str',
        modifiedDate: new Date(),
        hours: 2.5,
      });

      expect(result).not.toBeNull();
      expect(result?.hours).toBe(2.5);
      expect(typeof result?.hours).toBe('number');
    });

    test('updateMissionData updates hours as numeric', async () => {
      const result = await updateMissionData(TEST_MISSION_ID, { hours: 3 });

      expect(result).not.toBeNull();
      expect(result?.hours).toBe(3);
      expect(typeof result?.hours).toBe('number');
    });

    test('updateMissionData converts string hours to numeric in DB', async () => {
      const result = await updateMissionData(TEST_MISSION_ID, {
        hours: 4.5,
      });

      expect(result).not.toBeNull();
      expect(result?.hours).toBe(4.5);
      expect(typeof result?.hours).toBe('number');
    });

    test('updateMissionData handles full spread mission with string hours (acceptMission scenario)', async () => {
      // Simulates: setMissionData(id, { ...missionToAccept, employeeId, status })
      // where hours is serialized as string through the Next.js RSC boundary
      const result = await updateMissionData(TEST_MISSION_ID, {
        ...baseMission,
        employeeId: null,
        status: 'accepted',
        hours: 4,
      });

      expect(result).not.toBeNull();
      expect(result?.hours).toBe(4);
      expect(typeof result?.hours).toBe('number');
      expect(result?.status).toBe('accepted');
    });
  });

  describe('Mission Actions - conciergerieComment field', () => {
    test('createNewMission stores conciergerieComment', async () => {
      const comment = 'Test conciergerie comment';
      const result = await createNewMission({
        ...baseMission,
        id: TEST_MISSION_ID + '-comment',
        modifiedDate: new Date(),
        conciergerieComment: comment,
      });

      expect(result).not.toBeNull();
      expect(result?.conciergerieComment).toBe(comment);
    });

    test('createNewMission handles undefined conciergerieComment', async () => {
      const result = await createNewMission({
        ...baseMission,
        id: TEST_MISSION_ID + '-no-comment',
        modifiedDate: new Date(),
        conciergerieComment: undefined,
      });

      expect(result).not.toBeNull();
      expect(result?.conciergerieComment).toBeUndefined();
    });

    test('updateMissionData updates conciergerieComment', async () => {
      const comment = 'Updated conciergerie comment';
      const result = await updateMissionData(TEST_MISSION_ID, {
        conciergerieComment: comment,
      });

      expect(result).not.toBeNull();
      expect(result?.conciergerieComment).toBe(comment);
    });

    test('updateMissionData clears conciergerieComment when set to undefined', async () => {
      // First set a comment
      await updateMissionData(TEST_MISSION_ID, {
        conciergerieComment: 'Test comment',
      });

      // Then clear it
      const result = await updateMissionData(TEST_MISSION_ID, {
        conciergerieComment: undefined,
      });

      expect(result).not.toBeNull();
      expect(result?.conciergerieComment).toBeUndefined();
    });

    test('updateMissionData preserves conciergerieComment when not provided', async () => {
      const comment = 'Preserved comment';
      await updateMissionData(TEST_MISSION_ID, {
        conciergerieComment: comment,
      });

      // Update another field without touching conciergerieComment
      const result = await updateMissionData(TEST_MISSION_ID, {
        hours: 5,
      });

      expect(result).not.toBeNull();
      expect(result?.conciergerieComment).toBe(comment);
      expect(result?.hours).toBe(5);
    });
  });

  describe('getMissionHoursPerProvider - duo mission hours splitting', () => {
    test('returns full hours for single provider mission', () => {
      const singleProviderMission: Mission = {
        ...baseMission,
        employeeId: 'employee1',
        employeeId2: null,
        hours: 4,
        modifiedDate: new Date(),
      };

      expect(getMissionHoursPerProvider(singleProviderMission)).toBe(4);
      expect(getMissionProviderCount(singleProviderMission)).toBe(1);
    });

    test('returns half hours for complete duo mission', () => {
      const duoMission: Mission = {
        ...baseMission,
        employeeId: 'employee1',
        employeeId2: 'employee2',
        hours: 4,
        modifiedDate: new Date(),
      };

      expect(getMissionHoursPerProvider(duoMission)).toBe(2);
      expect(getMissionProviderCount(duoMission)).toBe(2);
    });

    test('returns half hours for duo mission with odd hours', () => {
      const duoMission: Mission = {
        ...baseMission,
        employeeId: 'employee1',
        employeeId2: 'employee2',
        hours: 5,
        modifiedDate: new Date(),
      };

      expect(getMissionHoursPerProvider(duoMission)).toBe(2.5);
      expect(getMissionProviderCount(duoMission)).toBe(2);
    });

    test('returns full hours for mission with only second provider', () => {
      const secondProviderOnlyMission: Mission = {
        ...baseMission,
        employeeId: null,
        employeeId2: 'employee2',
        hours: 3,
        modifiedDate: new Date(),
      };

      expect(getMissionHoursPerProvider(secondProviderOnlyMission)).toBe(3);
      expect(getMissionProviderCount(secondProviderOnlyMission)).toBe(1);
    });

    test('handles zero hours for duo mission', () => {
      const duoMission: Mission = {
        ...baseMission,
        employeeId: 'employee1',
        employeeId2: 'employee2',
        hours: 0,
        modifiedDate: new Date(),
      };

      expect(getMissionHoursPerProvider(duoMission)).toBe(0);
      expect(getMissionProviderCount(duoMission)).toBe(2);
    });

    test('returns 0 for mission with no providers', () => {
      const noProviderMission: Mission = {
        ...baseMission,
        employeeId: null,
        employeeId2: null,
        hours: 4,
        modifiedDate: new Date(),
      };

      expect(getMissionHoursPerProvider(noProviderMission)).toBe(0);
      expect(getMissionProviderCount(noProviderMission)).toBe(0);
    });
  });
});
