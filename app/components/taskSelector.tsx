import Label from '@/app/components/label';
import { Task } from '@/app/types/dataTypes';
import { errorClassName, rowClassName } from '@/app/utils/className';
import { getTaskPoints } from '@/app/utils/task';
import { clsx } from 'clsx/lite';
import { ForwardRefRenderFunction, ReactNode, forwardRef } from 'react';

interface TaskSelectorProps {
  id: string;
  label: ReactNode;
  availableTasks: Task[];
  selectedTasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  error: string;
  setError: (error: string) => void;
  disabled: boolean;
  required?: boolean;
  className?: string;
  row?: boolean;
}

const TaskSelectorComponent: ForwardRefRenderFunction<HTMLDivElement, TaskSelectorProps> = (
  {
    id,
    label,
    availableTasks,
    selectedTasks,
    onTasksChange,
    error,
    setError,
    disabled,
    required = false,
    className = '',
    row = false,
  },
  ref,
) => {
  const toggleTask = (task: Task) => {
    setError('');
    if (selectedTasks.includes(task)) {
      onTasksChange(selectedTasks.filter(t => t !== task));
    } else {
      onTasksChange([...selectedTasks, task]);
    }
  };

  return (
    <div className={row ? rowClassName : className}>
      <Label id={id} required={required}>
        {label}
      </Label>
      <div ref={ref} className="grid grid-cols-2 gap-2">
        {availableTasks.map(task => {
          const points = getTaskPoints(task);
          return (
            <button
              type="button"
              key={task}
              onClick={() => toggleTask(task)}
              disabled={disabled}
              className={clsx(
                'p-2 border rounded-lg text-sm flex justify-between items-center',
                'border-foreground/20 focus-visible:outline-primary',
                selectedTasks.includes(task)
                  ? 'bg-primary text-background border-primary'
                  : 'bg-background text-foreground border-secondary',
              )}
            >
              <span>{task}</span>
              <span
                className={clsx(
                  'px-1.5 py-0.5 rounded-full text-xs',
                  selectedTasks.includes(task) ? 'bg-background/20 text-background' : 'bg-primary/10 text-primary',
                )}
              >
                {points} pt{points !== 1 ? 's' : ''}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className={errorClassName}>{error}</p>}
    </div>
  );
};

const TaskSelector = forwardRef<HTMLDivElement, TaskSelectorProps>(TaskSelectorComponent);

TaskSelector.displayName = 'TaskSelector';

export default TaskSelector;
