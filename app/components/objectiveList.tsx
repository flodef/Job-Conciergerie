'use client';

import clsx from 'clsx/lite';
import { useEffect, useRef } from 'react';

export default function ObjectiveList({
  objectives,
  setObjectives,
}: {
  objectives: string[];
  setObjectives: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const prevObjectivesLength = useRef(objectives.length);
  useEffect(() => {
    if (objectives.length !== prevObjectivesLength.current) {
      const focusIndex =
        objectives.length > prevObjectivesLength.current
          ? objectives.length - 1 // Add : focus new point
          : Math.min(objectives.length - 1, prevObjectivesLength.current - 1); // Delete : focus last existing

      setTimeout(() => {
        inputRefs.current[focusIndex]?.focus();
      }, 10);
    }
    prevObjectivesLength.current = objectives.length;
  }, [objectives.length]);

  const addObjective = () => {
    // Prevent adding more than 10 points
    if (objectives.length >= 10) {
      return;
    }

    if (objectives[objectives.length - 1]?.trim() !== '') {
      setObjectives([...objectives, '']);
    }
  };

  const editObjective = (index: number, valeur: string) => {
    const newObjectives = [...objectives];
    newObjectives[index] = valeur;
    setObjectives(newObjectives);
  };

  const deleteObjective = (index: number) => {
    if (objectives.length === 1) {
      const newObjectives = [...objectives];
      newObjectives[0] = '';
      setObjectives(newObjectives);
    } else {
      setObjectives(objectives.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-foreground">Objectifs</h2>
        {(objectives.length === 0 || objectives[objectives.length - 1]?.trim() !== '') && objectives.length < 10 && (
          <button
            type="button"
            onClick={addObjective}
            className="text-sm bg-foreground/10 text-foreground px-3 rounded-md hover:bg-foreground/20 transition-colors"
          >
            + Ajouter
          </button>
        )}
        {objectives.length >= 10 && <span className="text-sm text-orange-500">Maximum de 10 points atteint</span>}
      </div>

      {objectives.map((objective, index) => (
        <div
          key={index}
          className="flex gap-2 items-center transition-all animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <input
            type="text"
            value={objective}
            onChange={e => editObjective(index, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addObjective();
              } else if (e.key === 'Backspace' && objective === '') {
                deleteObjective(index);
                e.preventDefault();
              }
            }}
            // className="flex-1 px-3 py-2 border rounded-lg bg-background text-foreground border-foreground/20 focus:ring-2 focus:ring-foreground/50"
            placeholder="Description de la tâche"
            ref={el => {
              if (el) inputRefs.current[index] = el;
            }}
            className={clsx(
              'flex-1 px-3 py-2 border rounded-lg bg-background text-foreground',
              'border-foreground/20 focus-visible:outline-primary',
            )}
          />
          {(objectives.length > 1 || objective !== '') && (
            <button
              type="button"
              onClick={() => deleteObjective(index)}
              className="text-red-500 hover:text-red-600 px-3 text-3xl rounded-md"
              aria-label="Supprimer"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
