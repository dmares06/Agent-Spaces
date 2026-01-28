#!/bin/bash
# Complete Personal Tasks Implementation Script
# Run this to create all remaining component files

cd "$(dirname "$0")"

echo "Creating Personal Tasks UI Components..."

# Create PersonalTasksPanel
cat > src/components/personalTasks/PersonalTasksPanel.tsx << 'EOF'
import { useState, useEffect } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import { PersonalTask } from '../../lib/types';
import PersonalKanbanBoard from './PersonalKanbanBoard';
import TaskQuickInput from './TaskQuickInput';
import TaskDetailsModal from './TaskDetailsModal';
import { LayoutGrid, X, Plus } from 'lucide-react';

interface PersonalTasksPanelProps {
  height: number;
  onResize: (newHeight: number) => void;
  onClose: () => void;
}

export default function PersonalTasksPanel({ height, onClose }: PersonalTasksPanelProps) {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<PersonalTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    todo: 0,
    working: 0,
    review: 0,
    completed: 0,
    overdue: 0,
    dueToday: 0
  });

  useEffect(() => {
    loadTasks();
    loadStats();

    // Real-time updates
    electronAPI.personalTask.onTaskCreated(handleTaskCreated);
    electronAPI.personalTask.onTaskUpdated(handleTaskUpdated);
    electronAPI.personalTask.onTaskDeleted(handleTaskDeleted);

    return () => {
      electronAPI.personalTask.offTaskCreated();
      electronAPI.personalTask.offTaskUpdated();
      electronAPI.personalTask.offTaskDeleted();
    };
  }, []);

  async function loadTasks() {
    const data = await electronAPI.personalTask.list();
    setTasks(data);
  }

  async function loadStats() {
    const data = await electronAPI.personalTask.getStats();
    setStats(data);
  }

  function handleTaskCreated(task: PersonalTask) {
    setTasks(prev => [task, ...prev]);
    loadStats();
  }

  function handleTaskUpdated(task: PersonalTask) {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    loadStats();
  }

  function handleTaskDeleted(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    loadStats();
  }

  async function handleQuickAdd(title: string) {
    await electronAPI.personalTask.create({
      title,
      status: 'todo',
      priority: 'medium'
    });
  }

  async function handleTaskMove(taskId: string, newStatus: PersonalTask['status']) {
    await electronAPI.personalTask.updateStatus(taskId, newStatus);
  }

  function handleTaskEdit(task: PersonalTask) {
    setSelectedTask(task);
    setIsModalOpen(true);
  }

  async function handleTaskDelete(taskId: string) {
    if (confirm('Delete this task?')) {
      await electronAPI.personalTask.delete(taskId);
    }
  }

  async function handleTaskSave(updates: Partial<PersonalTask>) {
    if (selectedTask && selectedTask.id) {
      await electronAPI.personalTask.update(selectedTask.id, updates);
    } else {
      await electronAPI.personalTask.create({
        status: 'todo',
        priority: 'medium',
        ...updates
      });
    }
    setIsModalOpen(false);
    setSelectedTask(null);
  }

  return (
    <div
      className="border-t border-border bg-background flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <LayoutGrid size={14} />
            Personal Tasks
          </h3>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Total: <strong className="text-foreground">{stats.total}</strong></span>
            {stats.dueToday > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                Due Today: <strong>{stats.dueToday}</strong>
              </span>
            )}
            {stats.overdue > 0 && (
              <span className="text-red-600 dark:text-red-400">
                Overdue: <strong>{stats.overdue}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedTask(null);
              setIsModalOpen(true);
            }}
            className="px-3 py-1 bg-accent text-white rounded text-xs font-medium hover:bg-accent/90 flex items-center gap-1"
          >
            <Plus size={12} />
            New Task
          </button>

          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
            title="Close Personal Tasks"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Quick Add */}
      <div className="px-4 py-2 border-b border-border">
        <TaskQuickInput onAdd={handleQuickAdd} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <PersonalKanbanBoard
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onTaskEdit={handleTaskEdit}
          onTaskDelete={handleTaskDelete}
        />
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleTaskSave}
      />
    </div>
  );
}
EOF

echo "✓ Created PersonalTasksPanel.tsx"

# Copy the component files from multi-agent-chatbot implementation
# Since we need to adapt them, let me create simplified versions

# Create PersonalKanbanBoard
cat > src/components/personalTasks/PersonalKanbanBoard.tsx << 'EOF'
import { PersonalTask } from '../../lib/types';
import PersonalKanbanColumn from './PersonalKanbanColumn';

interface PersonalKanbanBoardProps {
  tasks: PersonalTask[];
  onTaskMove: (taskId: string, newStatus: PersonalTask['status']) => void;
  onTaskEdit: (task: PersonalTask) => void;
  onTaskDelete: (taskId: string) => void;
}

const COLUMNS = [
  { id: 'todo' as const, title: 'Want to Get Done', color: 'gray' },
  { id: 'working' as const, title: 'Working On', color: 'blue' },
  { id: 'review' as const, title: 'Needs Review', color: 'purple' },
  { id: 'completed' as const, title: 'Completed', color: 'green' }
];

export default function PersonalKanbanBoard({
  tasks,
  onTaskMove,
  onTaskEdit,
  onTaskDelete
}: PersonalKanbanBoardProps) {
  const tasksByStatus: Record<PersonalTask['status'], PersonalTask[]> = {
    todo: [],
    working: [],
    review: [],
    completed: []
  };

  tasks.forEach(task => {
    tasksByStatus[task.status].push(task);
  });

  Object.values(tasksByStatus).forEach(taskList => {
    taskList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  return (
    <div className="grid grid-cols-4 gap-4 h-full">
      {COLUMNS.map(column => (
        <PersonalKanbanColumn
          key={column.id}
          title={column.title}
          color={column.color}
          status={column.id}
          tasks={tasksByStatus[column.id]}
          onDrop={(taskId) => onTaskMove(taskId, column.id)}
          onTaskEdit={onTaskEdit}
          onTaskDelete={onTaskDelete}
        />
      ))}
    </div>
  );
}
EOF

echo "✓ Created PersonalKanbanBoard.tsx"

echo "
========================================
NEXT STEPS:
========================================
1. Copy remaining component files from:
   /Users/kimberlymares/multi-agent-chatbot/extension/overlay/src/components/personalTasks/

   Files needed:
   - PersonalKanbanColumn.tsx
   - PersonalTaskCard.tsx
   - TaskQuickInput.tsx
   - TaskDetailsModal.tsx

2. Update TopNavigationBar.tsx (see PERSONAL_TASKS_IMPLEMENTATION.md)
3. Update WorkspacePage.tsx (see PERSONAL_TASKS_IMPLEMENTATION.md)
4. Build and test:
   npm run build
   npm run electron:dev

See /Users/kimberlymares/Documents/agent-workspace/PERSONAL_TASKS_IMPLEMENTATION.md for details.
"
EOF

chmod +x /Users/kimberlymares/Documents/agent-workspace/COMPLETE_IMPLEMENTATION.sh
