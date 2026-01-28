import { PersonalTask } from '../../lib/types';
import { electronAPI } from '../../lib/electronAPI';

interface PersonalTaskCardProps {
  task: PersonalTask;
  onEdit: (task: PersonalTask) => void;
  onDelete: (taskId: string) => void;
}

export default function PersonalTaskCard({ task, onEdit, onDelete }: PersonalTaskCardProps) {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/personal-task-id', task.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  async function handleComplete() {
    await electronAPI.personalTask.updateStatus(task.id, 'completed');
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = () => {
    if (!task.due_date || task.status === 'completed') return false;
    return new Date(task.due_date) < new Date();
  };

  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  };

  // Parse tags from JSON string
  const tags = task.tags ? JSON.parse(task.tags) : [];

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-move hover:shadow-lg transition-shadow mb-2"
    >
      {/* Priority indicator bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${priorityColors[task.priority]}`} />

      {/* Content */}
      <div className="ml-2">
        {/* Title */}
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          {task.title}
        </h4>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs mb-2">
          {task.due_date && (
            <span className={`flex items-center ${isOverdue() ? 'text-red-600 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
              📅 {formatDate(task.due_date)}
              {isOverdue() && ' (Overdue)'}
            </span>
          )}
          {tags.length > 0 && (
            <div className="flex gap-1">
              {tags.slice(0, 2).map((tag: string, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {task.status !== 'completed' && (
            <button
              onClick={handleComplete}
              className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              ✓ Complete
            </button>
          )}
          <button
            onClick={() => onEdit(task)}
            className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
