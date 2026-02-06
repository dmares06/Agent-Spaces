import { useState, useEffect } from 'react';
import { PersonalTask } from '../../lib/types';
import { MoreHorizontal, Plus } from 'lucide-react';

interface PersonalKanbanBoardProps {
  tasks: PersonalTask[];
  onTaskMove: (taskId: string, newStatus: PersonalTask['status']) => void;
  onTaskEdit: (task: PersonalTask) => void;
  onTaskDelete: (taskId: string) => void;
  onQuickAdd?: (title: string, status: PersonalTask['status'], priority: PersonalTask['priority']) => void;
}

const COLUMNS = [
  { id: 'todo' as const, title: 'To Do', color: '#6366f1' }, // Indigo
  { id: 'working' as const, title: 'In Progress', color: '#f59e0b' }, // Amber
  { id: 'completed' as const, title: 'Done', color: '#10b981' }, // Emerald
];

interface TaskCardProps {
  task: PersonalTask;
  onEdit: (task: PersonalTask) => void;
  onDelete: (taskId: string) => void;
  isCompleted?: boolean;
  onFadeComplete?: () => void;
}

const PRIORITY_CONFIG = {
  low: { color: 'bg-green-500', label: 'Low' },
  medium: { color: 'bg-yellow-500', label: 'Med' },
  high: { color: 'bg-red-500', label: 'High' },
};

function TaskCard({ task, onEdit, onDelete, isCompleted, onFadeComplete }: TaskCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const priority = task.priority || 'medium';
  const priorityConfig = PRIORITY_CONFIG[priority];

  // Auto-fade completed tasks
  useEffect(() => {
    if (isCompleted && task.completed_at) {
      const completedTime = new Date(task.completed_at).getTime();
      const now = Date.now();
      const elapsed = now - completedTime;
      const fadeDelay = 5000; // 5 seconds before fading
      const remaining = fadeDelay - elapsed;

      if (remaining <= 0) {
        setIsFading(true);
        const timeout = setTimeout(() => {
          onFadeComplete?.();
        }, 500); // Fade animation duration
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setIsFading(true);
          setTimeout(() => {
            onFadeComplete?.();
          }, 500);
        }, remaining);
        return () => clearTimeout(timeout);
      }
    }
  }, [isCompleted, task.completed_at, onFadeComplete]);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/personal-task-id', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onEdit(task)}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(!showMenu);
      }}
      className={`
        relative bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2.5
        cursor-grab active:cursor-grabbing
        hover:border-[#4a4a4a] hover:bg-[#303030]
        transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isFading ? 'opacity-0 scale-95 pointer-events-none' : ''}
      `}
    >
      {/* Priority Tag - Top row */}
      <div className="flex justify-end mb-1.5">
        <span
          className={`
            px-1.5 py-0.5 rounded text-[10px] font-bold text-white uppercase
            ${priorityConfig.color}
          `}
          title={`${priorityConfig.label} Priority`}
        >
          {priorityConfig.label}
        </span>
      </div>

      {/* Task Title - Below priority tag */}
      <span className="text-sm text-gray-100 font-medium leading-snug block">
        {task.title}
      </span>

      {/* Context Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg shadow-lg py-1 min-w-[120px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#3a3a3a]"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[#3a3a3a]"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface KanbanColumnProps {
  title: string;
  color: string;
  status: PersonalTask['status'];
  tasks: PersonalTask[];
  onDrop: (taskId: string) => void;
  onTaskEdit: (task: PersonalTask) => void;
  onTaskDelete: (taskId: string) => void;
  onQuickAdd?: (title: string, priority: PersonalTask['priority']) => void;
  hiddenTaskIds: Set<string>;
  onTaskHide: (taskId: string) => void;
}

function KanbanColumn({
  title,
  color,
  status,
  tasks,
  onDrop,
  onTaskEdit,
  onTaskDelete,
  onQuickAdd,
  hiddenTaskIds,
  onTaskHide,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<PersonalTask['priority']>('medium');
  const [showMenu, setShowMenu] = useState(false);

  const visibleTasks = tasks.filter(t => !hiddenTaskIds.has(t.id));

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('application/personal-task-id');
    if (taskId) {
      onDrop(taskId);
    }
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newTaskTitle.trim() && onQuickAdd) {
      onQuickAdd(newTaskTitle.trim(), newTaskPriority);
      setNewTaskTitle('');
      setNewTaskPriority('medium');
      setShowAddInput(false);
    }
  }

  return (
    <div
      className={`
        flex flex-col min-h-[300px] bg-[#1a1a1a] rounded-xl p-4
        ${isDragOver ? 'ring-2 ring-blue-500/50' : ''}
        transition-all duration-200
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-gray-100">{title}</span>
          <span className="px-2 py-0.5 bg-[#2a2a2a] rounded-md text-xs text-gray-400">
            {visibleTasks.length}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
          >
            <MoreHorizontal size={16} className="text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg shadow-lg py-1 min-w-[140px]">
                <button
                  onClick={() => {
                    setShowAddInput(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#3a3a3a] flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add Task
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Add Input */}
      {showAddInput && (
        <form onSubmit={handleAddSubmit} className="mb-3 space-y-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task title..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowAddInput(false);
                setNewTaskTitle('');
                setNewTaskPriority('medium');
              }
            }}
            className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
          />
          {/* Priority Selection */}
          <div className="flex gap-1">
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => setNewTaskPriority(key as PersonalTask['priority'])}
                className={`
                  flex-1 px-2 py-1 rounded text-xs font-medium transition-all
                  ${newTaskPriority === key
                    ? `${config.color} text-white`
                    : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                  }
                `}
              >
                {config.label}
              </button>
            ))}
          </div>
          {/* Submit Button */}
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add Task
          </button>
        </form>
      )}

      {/* Task List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {visibleTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            {isDragOver ? 'Drop here' : 'No tasks'}
          </div>
        ) : (
          visibleTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onTaskEdit}
              onDelete={onTaskDelete}
              isCompleted={status === 'completed'}
              onFadeComplete={() => onTaskHide(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function PersonalKanbanBoard({
  tasks,
  onTaskMove,
  onTaskEdit,
  onTaskDelete,
  onQuickAdd,
}: PersonalKanbanBoardProps) {
  const [hiddenTaskIds, setHiddenTaskIds] = useState<Set<string>>(new Set());

  // Group tasks by status (mapping 'review' to 'working' for simpler 3-column view)
  const tasksByStatus: Record<'todo' | 'working' | 'completed', PersonalTask[]> = {
    todo: [],
    working: [],
    completed: [],
  };

  tasks.forEach(task => {
    if (task.status === 'review') {
      // Map review to working for this simplified view
      tasksByStatus.working.push(task);
    } else {
      tasksByStatus[task.status].push(task);
    }
  });

  // Sort each column by creation date (newest first)
  Object.values(tasksByStatus).forEach(taskList => {
    taskList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  function handleTaskHide(taskId: string) {
    setHiddenTaskIds(prev => new Set([...prev, taskId]));
  }

  function handleQuickAddForStatus(title: string, status: PersonalTask['status'], priority: PersonalTask['priority']) {
    onQuickAdd?.(title, status, priority);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map(column => (
        <KanbanColumn
          key={column.id}
          title={column.title}
          color={column.color}
          status={column.id}
          tasks={tasksByStatus[column.id]}
          onDrop={(taskId) => onTaskMove(taskId, column.id)}
          onTaskEdit={onTaskEdit}
          onTaskDelete={onTaskDelete}
          onQuickAdd={(title, priority) => handleQuickAddForStatus(title, column.id, priority)}
          hiddenTaskIds={hiddenTaskIds}
          onTaskHide={handleTaskHide}
        />
      ))}
    </div>
  );
}
