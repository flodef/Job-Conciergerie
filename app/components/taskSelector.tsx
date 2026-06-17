import Label from '@/app/components/label';
import type { Task } from '@/app/types/dataTypes';
import { cn, errorClassName, rowClassName } from '@/app/utils/className';
import type { ForwardRefRenderFunction, ReactNode } from 'react';
import { forwardRef } from 'react';

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
  tooltip?: ReactNode;
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
    tooltip,
  },
  ref,
) => {
  const toggleTask = (task: Task) => {
    setError('');
    if (selectedTasks.includes(task)) {
      if (selectedTasks.length === 1) return;
      onTasksChange(selectedTasks.filter(t => t !== task));
    } else {
      onTasksChange([...selectedTasks, task]);
    }
  };

  return (
    <div className={row ? rowClassName : className}>
      <Label id={id} required={required} tooltip={tooltip}>
        {label}
      </Label>
      <div
        ref={ref}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${availableTasks.length}, minmax(0, 1fr))` }}
      >
        {availableTasks.map(task => (
          <button
            type="button"
            key={task}
            onClick={() => toggleTask(task)}
            disabled={disabled}
            className={cn(
              'px-2 py-1 border rounded-lg text-sm flex justify-center items-center',
              'border-foreground/20 focus-visible:outline-primary cursor-pointer',
              selectedTasks.includes(task)
                ? 'bg-primary text-background border-primary'
                : 'bg-background text-foreground border-secondary',
            )}
          >
            <span>{task}</span>
          </button>
        ))}
      </div>
      {error && <p className={errorClassName}>{error}</p>}
    </div>
  );
};

const TaskSelector = forwardRef<HTMLDivElement, TaskSelectorProps>(TaskSelectorComponent);

TaskSelector.displayName = 'TaskSelector';

export default TaskSelector;
