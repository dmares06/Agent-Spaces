import { CheckCircle, Loader2, AlertCircle, ListTodo } from 'lucide-react';
import type { TaskMetadata } from '../../lib/types';

interface TaskCreationCardProps {
  task: TaskMetadata;
  status: 'creating' | 'created' | 'error';
  onClick?: () => void;
}

export default function TaskCreationCard({ task, status, onClick }: TaskCreationCardProps) {
  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg border transition-all duration-300
        ${status === 'creating' ? 'bg-muted/30 border-muted animate-pulse' : ''}
        ${status === 'created' ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : ''}
        ${status === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' : ''}
        ${onClick && status === 'created' ? 'cursor-pointer hover:shadow-md hover:border-accent' : ''}
      `}
      onClick={status === 'created' ? onClick : undefined}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {status === 'creating' && (
          <Loader2 size={18} className="text-accent animate-spin" />
        )}
        {status === 'created' && (
          <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
        )}
        {status === 'error' && (
          <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
        )}
        {!status && (
          <ListTodo size={18} className="text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground leading-tight">
            {task.title}
          </h4>
          {status === 'creating' && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Creating...
            </span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </p>
        )}
        {status === 'created' && onClick && (
          <p className="text-xs text-accent mt-1">
            Click to view in task panel
          </p>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Failed to create task
          </p>
        )}
      </div>
    </div>
  );
}
