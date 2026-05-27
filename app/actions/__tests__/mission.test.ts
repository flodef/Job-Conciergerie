// @vitest-environment node
import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { createNewMission, updateMissionData } from '../mission';
import { createHome } from '@/app/db/homeDb';
import { deleteMission } from '@/app/db/missionDb';
import { sql } from '@/app/db/db';
import { Mission, Task } from '@/app/types/dataTypes';

const TEST_HOME_ID = 'test-home-hours-fix';
const TEST_MISSION_ID = 'test-mission-hours-fix';
const TEST_CONCIERGERIE = 'MENTHEREGLISSE';

beforeAll(async () => {
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
  });
});

afterAll(async () => {
  // Cleanup test data
  await deleteMission(TEST_MISSION_ID);
  await deleteMission(TEST_MISSION_ID + '-str');
  await sql`DELETE FROM homes WHERE id = ${TEST_HOME_ID}`;
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
      hours: '2.5' as any,
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
    const result = await updateMissionData(TEST_MISSION_ID, { hours: '4.5' as any });

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
      hours: '4' as any,
    });

    expect(result).not.toBeNull();
    expect(result?.hours).toBe(4);
    expect(typeof result?.hours).toBe('number');
    expect(result?.status).toBe('accepted');
  });
});
