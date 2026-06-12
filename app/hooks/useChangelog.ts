import packageJson from '@/package.json';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'changelog_seen_version';

export type VersionEntry = { version: string; notes: string };

/** Parse a single-file changelog into version entries, ordered newest first */
export function parseChangelog(markdown: string): VersionEntry[] {
  const sections = markdown.split(/^(?=# )/m).filter(Boolean);
  return sections.map(section => {
    const lines = section.split('\n');
    const version = lines[0].replace(/^#\s*/, '').trim();
    const notes = lines.slice(1).join('\n').trim();
    return { version, notes };
  });
}

function parseVersionParts(v: string): number[] {
  return v.split('.').map(Number);
}

/** Returns true if version `a` is strictly greater than version `b` */
export function versionGt(a: string, b: string): boolean {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na > nb;
  }
  return false;
}

/**
 * Returns entries from the changelog that are newer than `seenVersion`.
 * This ensures users who skipped versions still see notes for those versions.
 */
export function getUnseenEntries(entries: VersionEntry[], seenVersion: string | null): VersionEntry[] {
  if (!seenVersion) return entries;
  return entries.filter(e => versionGt(e.version, seenVersion));
}

export function useChangelog(userType: 'employee' | 'conciergerie' | undefined) {
  const [showModal, setShowModal] = useState(false);
  const [entries, setEntries] = useState<VersionEntry[]>([]);

  useEffect(() => {
    if (!userType) return;

    const seenVersion = localStorage.getItem(STORAGE_KEY);
    if (seenVersion === packageJson.version) return;

    fetch(`/changelog/${userType}.md?v=${packageJson.version}`, { cache: 'no-store' })
      .then(res => (res.ok ? res.text() : null))
      .then(text => {
        if (!text) return;
        const unseen = getUnseenEntries(parseChangelog(text), seenVersion);
        if (unseen.length === 0) return;
        setEntries(unseen);
        setShowModal(true);
      })
      .catch(() => {});
  }, [userType]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, packageJson.version);
    setShowModal(false);
  };

  return { showModal, entries, dismiss };
}
