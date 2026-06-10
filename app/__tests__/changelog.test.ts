import { describe, expect, test } from 'vitest';
import type { VersionEntry } from '@/app/hooks/useChangelog';
import { getUnseenEntries, parseChangelog, versionGt } from '@/app/hooks/useChangelog';

// ---------------------------------------------------------------------------
// parseChangelog
// ---------------------------------------------------------------------------
describe('parseChangelog', () => {
  const markdown = `# 2.73

- **Feature A** : description A

# 2.71

- **Feature B** : description B

# 2.70

- **Feature C** : description C
`;

  test('parses all sections', () => {
    const entries = parseChangelog(markdown);
    expect(entries).toHaveLength(3);
  });

  test('extracts version from h1 heading', () => {
    const entries = parseChangelog(markdown);
    expect(entries[0].version).toBe('2.73');
    expect(entries[1].version).toBe('2.71');
    expect(entries[2].version).toBe('2.70');
  });

  test('extracts notes content (without the heading line)', () => {
    const entries = parseChangelog(markdown);
    expect(entries[0].notes).toContain('Feature A');
    expect(entries[0].notes).not.toContain('# 2.73');
  });

  test('returns empty array for empty string', () => {
    expect(parseChangelog('')).toHaveLength(0);
  });

  test('handles single entry with no trailing newline', () => {
    const entries = parseChangelog('# 1.0\n- note');
    expect(entries).toHaveLength(1);
    expect(entries[0].version).toBe('1.0');
  });
});

// ---------------------------------------------------------------------------
// versionGt
// ---------------------------------------------------------------------------
describe('versionGt', () => {
  test('2.73 > 2.71', () => expect(versionGt('2.73', '2.71')).toBe(true));
  test('2.71 is not > 2.73', () => expect(versionGt('2.71', '2.73')).toBe(false));
  test('equal versions return false', () => expect(versionGt('2.71', '2.71')).toBe(false));
  test('major version wins', () => expect(versionGt('3.0', '2.99')).toBe(true));
  test('patch version comparison', () => expect(versionGt('2.71.1', '2.71.0')).toBe(true));
  test('missing patch treated as 0', () => expect(versionGt('2.71', '2.71.0')).toBe(false));
  test('2.71.1 > 2.71 (missing patch = 0)', () => expect(versionGt('2.71.1', '2.71')).toBe(true));
});

// ---------------------------------------------------------------------------
// getUnseenEntries
// ---------------------------------------------------------------------------
describe('getUnseenEntries', () => {
  const entries: VersionEntry[] = [
    { version: '2.75', notes: 'notes 75' },
    { version: '2.73', notes: 'notes 73' },
    { version: '2.71', notes: 'notes 71' },
    { version: '2.70', notes: 'notes 70' },
  ];

  test('returns all entries when seenVersion is null (first time user)', () => {
    expect(getUnseenEntries(entries, null)).toHaveLength(4);
  });

  test('returns no entries when already on latest version', () => {
    expect(getUnseenEntries(entries, '2.75')).toHaveLength(0);
  });

  test('user on 2.70 jumping to 2.75 sees all 3 newer versions', () => {
    const unseen = getUnseenEntries(entries, '2.70');
    expect(unseen).toHaveLength(3);
    expect(unseen.map(e => e.version)).toEqual(['2.75', '2.73', '2.71']);
  });

  test('user who skipped from 2.71 to 2.75 sees 2.73 and 2.75', () => {
    const unseen = getUnseenEntries(entries, '2.71');
    expect(unseen).toHaveLength(2);
    expect(unseen.map(e => e.version)).toEqual(['2.75', '2.73']);
  });

  test('user who skipped from 2.70 to 2.73 (no 2.75 note) sees 2.73 and 2.71', () => {
    const subset: VersionEntry[] = [
      { version: '2.73', notes: 'notes 73' },
      { version: '2.71', notes: 'notes 71' },
      { version: '2.70', notes: 'notes 70' },
    ];
    const unseen = getUnseenEntries(subset, '2.70');
    expect(unseen).toHaveLength(2);
    expect(unseen.map(e => e.version)).toEqual(['2.73', '2.71']);
  });

  test('returns empty array when no entries', () => {
    expect(getUnseenEntries([], '2.70')).toHaveLength(0);
  });
});
