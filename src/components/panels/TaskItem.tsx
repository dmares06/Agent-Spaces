import { type Task } from '../../lib/types';
import StatusBadge, { type Status } from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import { Trash2, User } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onDelete?: (id: string) => void;
}

export default function TaskItem({ task, onDelete }: TaskItemProps) {
  const statusMap: Record<Task['status'], Status> = {
    todo: 'pending',
    planning: 'in_progress',
    working: 'in_progress',
    review: 'in_progress',
    needs_input: 'pending',
    complete: 'completed',
    failed: 'failed',
  };

  const progressColor = task.status === 'complete' ? 'green' : task.status === 'failed' ? 'red' : ['planning', 'working', 'review'].includes(task.status) ? 'blue' : 'accent';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/task-id', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2 hover:bg-muted/50 transition-colors cursor-move"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
          )}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete task"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Assigned Agent */}
      {task.assigned_agent_name ? (
        <div className="flex items-center gap-2 px-2 py-1 bg-accent/10 rounded">
          {task.assigned_agent_avatar ? (
            <img src={task.assigned_agent_avatar} alt={task.assigned_agent_name} className="w-4 h-4 rounded-full" />
          ) : (
            <User size={12} className="text-muted-foreground" />
          )}
          <span className="text-xs font-medium">@{task.assigned_agent_name}</span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">Unassigned</span>
      )}

      {/* Status Badge */}
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={statusMap[task.status]} />
        <span className="text-xs text-muted-foreground">
          {new Date(task.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Progress Bar */}
      {['planning', 'working', 'review'].includes(task.status) && task.progress > 0 && (
        <ProgressBar value={task.progress} size="sm" color={progressColor} showLabel />
      )}

      {task.status === 'complete' && (
        <ProgressBar value={100} size="sm" color="green" />
      )}
    </div>
  );
}
