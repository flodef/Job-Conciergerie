import { describe, it, expect, vi } from 'vitest';
import {
  generateSimpleId,
  formatId,
  containsId,
  isNewDevice,
  getConnectedDevices,
  getDevices,
  MaxDevicesError,
  MAX_DEVICES,
} from '@/app/utils/id';

describe('ID Utilities', () => {
  describe('MAX_DEVICES', () => {
    it('should have default value of 5', () => {
      expect(MAX_DEVICES).toBe(5);
    });
  });

  describe('generateSimpleId', () => {
    it('should generate a non-empty string', () => {
      const id = generateSimpleId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs', () => {
      const id1 = generateSimpleId();
      const id2 = generateSimpleId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('formatId', () => {
    it('should return short IDs unchanged', () => {
      expect(formatId('abc123')).toBe('abc123');
    });

    it('should format long IDs with ellipsis', () => {
      const longId = 'abcdefghijklmnopqrstuvwxyz123456';
      const formatted = formatId(longId);
      expect(formatted).toContain('...');
      expect(formatted.startsWith('abcd')).toBe(true);
      expect(formatted.endsWith('3456')).toBe(true);
    });

    it('should remove $ prefix from new device IDs', () => {
      expect(formatId('$abc123')).toBe('abc123');
    });
  });

  describe('containsId', () => {
    it('should find matching ID in list', () => {
      const ids = ['abc123', 'def456', 'ghi789'];
      expect(containsId(ids, 'abc123')).toBe(true);
    });

    it('should not find non-matching ID', () => {
      const ids = ['abc123', 'def456'];
      expect(containsId(ids, 'xyz999')).toBe(false);
    });

    it('should handle $ prefix matching', () => {
      const ids = ['$abc123', 'def456'];
      expect(containsId(ids, 'abc123')).toBe(true);
      expect(containsId(ids, '$abc123')).toBe(true);
    });
  });

  describe('isNewDevice', () => {
    it('should return true for IDs with $ prefix', () => {
      expect(isNewDevice('$abc123')).toBe(true);
    });

    it('should return false for IDs without $ prefix', () => {
      expect(isNewDevice('abc123')).toBe(false);
    });
  });

  describe('getConnectedDevices', () => {
    it('should filter out new device IDs', () => {
      const ids = ['$new1', 'connected1', '$new2', 'connected2'];
      const connected = getConnectedDevices(ids);
      expect(connected).toEqual(['connected1', 'connected2']);
    });

    it('should return empty array if all are new devices', () => {
      const ids = ['$new1', '$new2'];
      expect(getConnectedDevices(ids)).toEqual([]);
    });
  });

  describe('getDevices', () => {
    it('should add new device to empty list', () => {
      const result = getDevices([], 'device1');
      expect(result).toEqual(['device1']);
    });

    it('should add new device to existing list', () => {
      const result = getDevices(['device1'], 'device2');
      expect(result).toEqual(['device1', 'device2']);
    });

    it('should add new device with $ prefix to existing list', () => {
      const result = getDevices(['existing'], 'device1', true);
      expect(result[1].startsWith('$')).toBe(true);
      expect(result[1]).toContain('device1');
    });

    it('should throw MaxDevicesError when limit reached', () => {
      const existingDevices = ['d1', 'd2', 'd3', 'd4', 'd5'];
      expect(() => getDevices(existingDevices, 'newDevice')).toThrow(MaxDevicesError);
    });

    it('should evict oldest device when evictOldest is true', () => {
      const existingDevices = ['d1', 'd2', 'd3', 'd4', 'd5'];
      const result = getDevices(existingDevices, 'newDevice', false, true);
      expect(result).toEqual(['d2', 'd3', 'd4', 'd5', 'newDevice']);
    });

    it('should remove duplicate before adding', () => {
      const result = getDevices(['d1', 'd2'], 'd1');
      expect(result).toEqual(['d2', 'd1']);
    });
  });

  describe('MaxDevicesError', () => {
    it('should have correct error message', () => {
      const error = new MaxDevicesError('oldestDevice123');
      expect(error.message).toContain('5');
      expect(error.name).toBe('MaxDevicesError');
      expect(error.oldestDevice).toBe('oldestDevice123');
    });
  });
});
