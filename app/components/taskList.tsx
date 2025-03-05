'use client';

import clsx from 'clsx/lite';
import { useEffect, useRef } from 'react';

export default function TaskList({
  tasks,
  setTasks,
}: {
  tasks: string[];
  setTasks: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const prevTasksLength = useRef(tasks.length);
  useEffect(() => {
    if (tasks.length !== prevTasksLength.current) {
      const focusIndex =
        tasks.length > prevTasksLength.current
          ? tasks.length - 1 // Add : focus new task
          : Math.min(tasks.length - 1, prevTasksLength.current - 1); // Delete : focus last existing

      setTimeout(() => {
        inputRefs.current[focusIndex]?.focus();
      }, 10);
    }
    prevTasksLength.current = tasks.length;
  }, [tasks.length]);

  const addTask = () => {
    if (tasks[tasks.length - 1]?.trim() !== '') {
      setTasks([...tasks, '']);
    }
  };

  const editTask = (index: number, valeur: string) => {
    const newTasks = [...tasks];
    newTasks[index] = valeur;
    setTasks(newTasks);
  };

  const deleteTask = (index: number) => {
    if (tasks.length === 1) {
      const newTasks = [...tasks];
      newTasks[0] = '';
      setTasks(newTasks);
    } else {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-2 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-medium text-foreground">Tâches</h2>
        {(tasks.length === 0 || tasks[tasks.length - 1]?.trim() !== '') && (
          <button
            type="button"
            onClick={addTask}
            className="text-sm bg-foreground/10 text-foreground px-3 rounded-md hover:bg-foreground/20 transition-colors"
          >
            + Ajouter
          </button>
        )}
      </div>

      {tasks.map((task, index) => (
        <div
          key={index}
          className="flex gap-2 items-center transition-all animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <input
            type="text"
            value={task}
            onChange={e => editTask(index, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addTask();
              } else if (e.key === 'Backspace' && task === '') {
                deleteTask(index);
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
          {(tasks.length > 1 || task !== '') && (
            <button
              type="button"
              onClick={() => deleteTask(index)}
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
