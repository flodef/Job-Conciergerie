'use client';

import clsx from 'clsx/lite';
import { useEffect, useRef, forwardRef, ForwardedRef, useImperativeHandle } from 'react';

type ObjectiveListProps = {
  objectives: string[];
  setObjectives: React.Dispatch<React.SetStateAction<string[]>>;
  maxObjectives: number;
};

const ObjectiveList = forwardRef(
  ({ objectives, setObjectives, maxObjectives }: ObjectiveListProps, forwardedRef: ForwardedRef<HTMLInputElement>) => {
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
      if (objectives.length >= maxObjectives) {
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

    // Forward the ref to the first input element in the component
    useImperativeHandle(forwardedRef, () => {
      // When the ref is accessed and inputRefs[0] is null, we need to handle that case
      // This is a workaround for TypeScript type checking with forwardRef
      if (!inputRefs.current[0]) {
        // Return a minimal implementation of HTMLInputElement when null
        return {
          focus: () => {
            // Try to focus the first input when it becomes available
            setTimeout(() => {
              if (inputRefs.current[0]) inputRefs.current[0].focus();
            }, 0);
          },
        } as unknown as HTMLInputElement;
      }
      return inputRefs.current[0];
    });

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-medium text-foreground">Objectifs</h2>
          {(objectives.length === 0 || objectives[objectives.length - 1]?.trim() !== '') &&
            objectives.length < maxObjectives && (
              <button
                type="button"
                onClick={addObjective}
                className="text-sm bg-foreground/10 text-foreground px-3 rounded-md hover:bg-foreground/20 transition-colors"
              >
                + Ajouter
              </button>
            )}
          {objectives.length >= maxObjectives && <span className="text-sm text-orange-500">Maximum atteint</span>}
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
                  // If this is the last objective, add a new one
                  if (index === objectives.length - 1) {
                    addObjective();
                  } else {
                    // Otherwise, move focus to the next objective
                    inputRefs.current[index + 1]?.focus();
                  }
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
  },
);

// Add display name for better debugging
ObjectiveList.displayName = 'ObjectiveList';

export default ObjectiveList;
