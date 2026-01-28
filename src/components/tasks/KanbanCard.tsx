import { type Task } from '../../lib/types';
import { User, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface KanbanCardProps {
  task: Task;
  onDelete?: (id: string) => void;
}

export default function KanbanCard({ task, onDelete }: KanbanCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/task-id', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Determine if task is actively being worked on (for animation)
  const isActive = ['planning', 'working', 'review'].includes(task.status);
  const isPulsing = ['planning', 'working'].includes(task.status);

  // Phase-based colors
  const phaseColors: Record<Task['status'], string> = {
    todo: 'border-gray-500',
    planning: 'border-blue-500',
    working: 'border-yellow-500',
    review: 'border-purple-500',
    needs_input: 'border-orange-500',
    complete: 'border-green-500',
    failed: 'border-red-500',
  };

  const phaseLabels: Record<Task['status'], string> = {
    todo: 'To Do',
    planning: 'Planning',
    working: 'Working',
    review: 'Review',
    needs_input: 'Needs Input',
    complete: 'Complete',
    failed: 'Failed',
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`p-3 bg-background border-l-4 ${phaseColors[task.status]} rounded-lg shadow-sm hover:shadow-md transition-all cursor-move ${
        isPulsing ? 'animate-pulse' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-foreground line-clamp-2">{task.title}</h4>
        {onDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete task"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
      )}

      {/* Assigned Agent */}
      {task.assigned_agent_name && (
        <div className="flex items-center gap-1.5 mb-2">
          {task.assigned_agent_avatar ? (
            <span className="text-base">{task.assigned_agent_avatar}</span>
          ) : (
            <User size={12} className="text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-foreground">@{task.assigned_agent_name}</span>
        </div>
      )}

      {/* Progress Bar (for active phases) */}
      {isActive && task.progress > 0 && (
        <div className="mb-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${
                task.status === 'planning'
                  ? 'bg-blue-500'
                  : task.status === 'working'
                  ? 'bg-yellow-500'
                  : 'bg-purple-500'
              } transition-all duration-300`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">
          {phaseLabels[task.status]}
        </span>
        {task.last_activity && (
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>{formatDistanceToNow(new Date(task.last_activity), { addSuffix: true })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
