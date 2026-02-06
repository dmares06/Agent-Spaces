import { PersonalTask } from '../../lib/types';
import { X, Edit, Trash2, Calendar } from 'lucide-react';

interface DayTasksModalProps {
  date: Date | null;
  tasks: PersonalTask[];
  isOpen: boolean;
  onClose: () => void;
  onTaskEdit: (task: PersonalTask) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskMove: (taskId: string, newStatus: PersonalTask['status']) => void;
}

export default function DayTasksModal({
  date,
  tasks,
  isOpen,
  onClose,
  onTaskEdit,
  onTaskDelete,
  onTaskMove
}: DayTasksModalProps) {
  if (!isOpen || !date) return null;

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getStatusColor = (status: PersonalTask['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'working':
        return 'bg-blue-500';
      case 'review':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: PersonalTask['status']) => {
    switch (status) {
      case 'todo':
        return 'Want to Get Done';
      case 'working':
        return 'Working On';
      case 'review':
        return 'Needs Review';
      case 'completed':
        return 'Completed';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[80vh] bg-background rounded-lg shadow-lg border border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Calendar size={18} />
              {formattedDate}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks scheduled for this day
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="bg-card border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm mb-1">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Status and Priority */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
                          <span className="text-xs text-muted-foreground">
                            {getStatusLabel(task.status)}
                          </span>
                        </div>

                        <span className={`text-xs px-2 py-0.5 rounded ${
                          task.priority === 'high'
                            ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                            : task.priority === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                            : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onTaskEdit(task)}
                        className="p-1.5 hover:bg-muted rounded"
                        title="Edit task"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onTaskDelete(task.id)}
                        className="p-1.5 hover:bg-muted rounded text-red-500 hover:text-red-600"
                        title="Delete task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Move to status buttons */}
                  {task.status !== 'completed' && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs text-muted-foreground mr-1">Move to:</span>
                        {task.status !== 'todo' && (
                          <button
                            onClick={() => onTaskMove(task.id, 'todo')}
                            className="text-xs px-2 py-1 bg-gray-500/20 hover:bg-gray-500/30 rounded"
                          >
                            To Do
                          </button>
                        )}
                        {task.status !== 'working' && (
                          <button
                            onClick={() => onTaskMove(task.id, 'working')}
                            className="text-xs px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded"
                          >
                            Working
                          </button>
                        )}
                        {task.status !== 'review' && (
                          <button
                            onClick={() => onTaskMove(task.id, 'review')}
                            className="text-xs px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded"
                          >
                            Review
                          </button>
                        )}
                        <button
                          onClick={() => onTaskMove(task.id, 'completed')}
                          className="text-xs px-2 py-1 bg-green-500/20 hover:bg-green-500/30 rounded"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
