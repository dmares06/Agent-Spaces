import { useState, useEffect } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import { PersonalTask } from '../../lib/types';
import PersonalKanbanBoard from './PersonalKanbanBoard';
import PersonalTaskCalendar from './PersonalTaskCalendar';
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

  async function handleDateSelect(date: Date) {
    // Open modal to create a new task for this date
    const dateStr = date.toISOString().split('T')[0];
    setSelectedTask({
      due_date: dateStr
    } as PersonalTask);
    setIsModalOpen(true);
  }

  async function handleTaskDropOnCalendar(taskId: string, dateStr: string) {
    // Update the task's due_date when dropped on calendar
    await electronAPI.personalTask.update(taskId, { due_date: dateStr });
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

      {/* Content - Kanban and Calendar stacked vertically */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Kanban Board at top */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Kanban Board</h4>
          <div className="h-[200px] overflow-y-auto">
            <PersonalKanbanBoard
              tasks={tasks}
              onTaskMove={handleTaskMove}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleTaskDelete}
            />
          </div>
        </div>

        {/* Calendar below */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Calendar</h4>
          <PersonalTaskCalendar
            tasks={tasks}
            onDateSelect={handleDateSelect}
            onTaskDrop={handleTaskDropOnCalendar}
          />
        </div>
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
