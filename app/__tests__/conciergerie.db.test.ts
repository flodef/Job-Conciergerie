import { describe, it, expect, vi } from 'vitest';

vi.mock('@/app/utils/notifications', () => ({
  defaultEmployeeSettings: { acceptedMissions: true, startedMissions: true, completedMissions: true },
  defaultConciergerieSettings: {},
}));

import { formatConciergerie } from '@/app/db/conciergerieDb';
import type { DbConciergerie } from '@/app/db/conciergerieDb';

const baseRow: DbConciergerie = {
  id: ['concierge1'],
  name: 'MENTHEREGLISSE',
  email: 'contact@menthereglisse.fr',
  tel: '0600000000',
  color_name: 'blue',
  notification_settings: null,
};

describe('formatConciergerie', () => {
  it('handles null notification_settings by using default', () => {
    const result = formatConciergerie(baseRow);
    expect(result.notificationSettings).toEqual({});
  });

  it('parses JSON string notification_settings', () => {
    const settings = { missionChanged: true, missionDeleted: false };
    const row: DbConciergerie = {
      ...baseRow,
      notification_settings: JSON.stringify(settings),
    };
    const result = formatConciergerie(row);
    expect(result.notificationSettings).toEqual(settings);
  });

  it('handles invalid JSON in notification_settings by using default', () => {
    const row: DbConciergerie = {
      ...baseRow,
      notification_settings: 'invalid json',
    };
    const result = formatConciergerie(row);
    expect(result.notificationSettings).toEqual({});
  });

  it('handles empty string notification_settings by using default', () => {
    const row: DbConciergerie = {
      ...baseRow,
      notification_settings: '',
    };
    const result = formatConciergerie(row);
    expect(result.notificationSettings).toEqual({});
  });

  it('preserves all other fields', () => {
    const result = formatConciergerie(baseRow);
    expect(result.id).toBe('concierge1');
    expect(result.name).toBe('MENTHEREGLISSE');
    expect(result.email).toBe('contact@menthereglisse.fr');
    expect(result.tel).toBe('0600000000');
    expect(result.colorName).toBe('blue');
  });
});
