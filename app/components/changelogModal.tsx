'use client';

import FullScreenModal from '@/app/components/fullScreenModal';
import { parseChangelog, VersionEntry } from '@/app/hooks/useChangelog';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const INITIAL_COUNT = 1;
const HISTORY_COUNT = 3;

function VersionSection({ entry }: { entry: VersionEntry }) {
  return (
    <div>
      <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wide mb-2">v. {entry.version}</p>
      <ReactMarkdown
        components={{
          ul: ({ children }) => <ul className="space-y-1 mb-1">{children}</ul>,
          li: ({ children }) => (
            <li className="text-sm text-foreground flex gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          p: ({ children }) => <p className="text-sm text-foreground">{children}</p>,
        }}
      >
        {entry.notes}
      </ReactMarkdown>
    </div>
  );
}

interface ChangelogModalProps {
  userType: 'employee' | 'conciergerie';
  onClose: () => void;
  /** 'current' = auto-show on new version (entries pre-loaded); 'history' = fetched from file */
  mode: 'current' | 'history';
  entries?: VersionEntry[];
}

export default function ChangelogModal({ userType, onClose, mode, entries: initialEntries }: ChangelogModalProps) {
  const [entries, setEntries] = useState<VersionEntry[]>(initialEntries ?? []);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (mode !== 'history') return;
    fetch(`/changelog/${userType}.md`)
      .then(res => (res.ok ? res.text() : null))
      .then(text => {
        if (text) setEntries(parseChangelog(text));
      })
      .catch(() => {});
  }, [mode, userType]);

  const visible = entries.slice(0, showAll ? HISTORY_COUNT : INITIAL_COUNT);
  const hasMore = entries.length > INITIAL_COUNT;

  const footer = hasMore ? (
    <button
      onClick={() => setShowAll(v => !v)}
      className="w-full flex items-center justify-center gap-1 py-3 text-sm text-foreground/60 hover:text-foreground transition-colors cursor-pointer"
    >
      {showAll ? (
        <>
          <IconChevronUp size={16} />
          Voir moins
        </>
      ) : (
        <>
          <IconChevronDown size={16} />
          Voir plus
        </>
      )}
    </button>
  ) : null;

  return (
    <FullScreenModal title="Nouveautés" onClose={onClose} footer={footer} disabled={false}>
      {entries.length === 0 ? (
        <p className="text-sm text-foreground/60 text-center py-4">Aucune note de version disponible.</p>
      ) : (
        <div className="space-y-4 py-1">
          {visible.map(entry => (
            <VersionSection key={entry.version} entry={entry} />
          ))}
        </div>
      )}
    </FullScreenModal>
  );
}
