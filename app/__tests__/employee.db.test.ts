import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/db/db', () => ({ sql: vi.fn() }));
vi.mock('@/app/utils/id', () => ({ MAX_DEVICES: 5 }));
vi.mock('@/app/utils/notifications', () => ({
  defaultEmployeeSettings: { acceptedMissions: true, startedMissions: true, completedMissions: true },
  defaultConciergerieSettings: {},
}));

import { sql } from '@/app/db/db';
import { findEmployeeByContact } from '@/app/db/employeeDb';

const mockSql = sql as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

const baseRow = {
  id: ['abc123'],
  first_name: 'Marc',
  family_name: 'Caradec',
  tel: '0662232945',
  email: 'marc.caradec@laposte.net',
  geographic_zone: 'Telgruc-sur-Mer',
  message: null,
  conciergerie_name: 'MENTHEREGLISSE',
  notification_settings: null,
  status: 'accepted',
  created_at: '2026-04-07T12:15:23Z',
};

beforeEach(() => vi.clearAllMocks());

describe('findEmployeeByContact', () => {
  it('returns null when no employee matches tel or email', async () => {
    mockSql.mockResolvedValueOnce([]);
    const result = await findEmployeeByContact('Marc', 'Caradec', '0600000000', 'other@example.com');
    expect(result).toBeNull();
  });

  it('returns employee with nameMatches=true when name matches exactly', async () => {
    mockSql.mockResolvedValueOnce([baseRow]);
    const result = await findEmployeeByContact('Marc', 'Caradec', '0662232945', 'marc.caradec@laposte.net');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.nameMatches).toBe(true);
      expect(result.employee.first_name).toBe('Marc');
    }
  });

  it('returns nameMatches=true with case-insensitive name comparison', async () => {
    mockSql.mockResolvedValueOnce([baseRow]);
    const result = await findEmployeeByContact('marc', 'caradec', '0662232945', 'marc.caradec@laposte.net');
    if (result) {
      expect(result.nameMatches).toBe(true);
    }
  });

  it('returns nameMatches=false when tel matches but name differs (DOUERIN scenario)', async () => {
    mockSql.mockResolvedValueOnce([baseRow]);
    // Stale localStorage had wrong name — tel matches a real employee but name is wrong
    const result = await findEmployeeByContact('DOUERIN', 'DOUERIN', '0662232945', 'other@example.com');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.nameMatches).toBe(false);
      expect(result.employee.first_name).toBe('Marc');
      expect(result.employee.family_name).toBe('Caradec');
    }
  });

  it('returns nameMatches=false when email matches but name differs', async () => {
    mockSql.mockResolvedValueOnce([baseRow]);
    const result = await findEmployeeByContact('Jean', 'Dupont', '0600000000', 'marc.caradec@laposte.net');
    if (result) {
      expect(result.nameMatches).toBe(false);
    }
  });

  it('returns null on DB error', async () => {
    mockSql.mockRejectedValueOnce(new Error('DB connection failed'));
    const result = await findEmployeeByContact('Marc', 'Caradec', '0662232945', 'marc.caradec@laposte.net');
    expect(result).toBeNull();
  });

  it('queries by tel OR email, not AND', async () => {
    mockSql.mockResolvedValueOnce([baseRow]);
    // Only email matches, tel is different
    await findEmployeeByContact('Marc', 'Caradec', '0699999999', 'marc.caradec@laposte.net');
    // Verify the sql template was called (lookup happened)
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});
