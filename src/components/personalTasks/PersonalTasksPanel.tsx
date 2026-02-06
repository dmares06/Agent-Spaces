import { useState, useEffect } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import { PersonalTask } from '../../lib/types';
import PersonalKanbanBoard from './PersonalKanbanBoard';
import PersonalTaskCalendar from './PersonalTaskCalendar';
import TaskQuickInput from './TaskQuickInput';
import TaskDetailsModal from './TaskDetailsModal';
import TaskNotifications from './TaskNotifications';
import WeeklySummaryModal from './WeeklySummaryModal';
import { LayoutGrid, X, Plus, Maximize2, Minimize2, BarChart3 } from 'lucide-react';

interface PersonalTasksPanelProps {
  height: number;
  onResize: (newHeight: number) => void;
  onClose: () => void;
}

export default function PersonalTasksPanel({ height, onClose }: PersonalTasksPanelProps) {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<PersonalTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
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

  // Keyboard shortcut for fullscreen
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

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

  async function handleQuickAdd(title: string, dueDate?: string, priority: PersonalTask['priority'] = 'medium') {
    await electronAPI.personalTask.create({
      title,
      status: 'todo',
      priority,
      ...(dueDate && { due_date: dueDate })
    });
  }

  async function handleKanbanQuickAdd(title: string, status: PersonalTask['status'], priority: PersonalTask['priority'] = 'medium') {
    await electronAPI.personalTask.create({
      title,
      status,
      priority,
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

  // If fullscreen, render as fixed overlay
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-100">Task Board</h1>
          </div>
          <div className="flex items-center gap-3">
            <TaskNotifications tasks={tasks} onTaskClick={handleTaskEdit} />
            <button
              onClick={() => setShowWeeklySummary(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-200 rounded-lg transition-colors"
            >
              <BarChart3 size={16} />
              Weekly Summary
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
              title="Exit Fullscreen (ESC)"
            >
              <Minimize2 size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Subtitle */}
        <div className="px-6 py-2 border-b border-[#2a2a2a]">
          <p className="text-sm text-gray-400">Drag tasks between columns to update their status</p>
        </div>

        {/* Fullscreen Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Kanban Board */}
          <PersonalKanbanBoard
            tasks={tasks}
            onTaskMove={handleTaskMove}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            onQuickAdd={handleKanbanQuickAdd}
          />

          {/* Calendar Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Calendar</h2>
            <PersonalTaskCalendar
              tasks={tasks}
              onDateSelect={handleDateSelect}
              onTaskDrop={handleTaskDropOnCalendar}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleTaskDelete}
              onTaskMove={handleTaskMove}
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

        {/* Weekly Summary Modal */}
        <WeeklySummaryModal
          isOpen={showWeeklySummary}
          onClose={() => setShowWeeklySummary(false)}
          tasks={tasks}
        />
      </div>
    );
  }

  // Normal panel mode
  return (
    <div
      className="border-t border-[#2a2a2a] bg-[#0a0a0a] flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-100">
            <LayoutGrid size={14} />
            Personal Tasks
          </h3>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>Total: <strong className="text-gray-200">{stats.total}</strong></span>
            {stats.dueToday > 0 && (
              <span className="text-amber-400">
                Due Today: <strong>{stats.dueToday}</strong>
              </span>
            )}
            {stats.overdue > 0 && (
              <span className="text-red-400">
                Overdue: <strong>{stats.overdue}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <TaskNotifications tasks={tasks} onTaskClick={handleTaskEdit} />

          <button
            onClick={() => setShowWeeklySummary(true)}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            title="Weekly Summary"
          >
            <BarChart3 size={16} className="text-gray-400" />
          </button>

          <button
            onClick={() => {
              setSelectedTask(null);
              setIsModalOpen(true);
            }}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 flex items-center gap-1 transition-colors"
          >
            <Plus size={12} />
            New Task
          </button>

          <button
            onClick={() => setIsFullscreen(true)}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            title="Fullscreen Mode"
          >
            <Maximize2 size={16} className="text-gray-400" />
          </button>

          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            title="Close Personal Tasks"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Quick Add */}
      <div className="px-4 py-2 border-b border-[#2a2a2a]">
        <TaskQuickInput onAdd={handleQuickAdd} />
      </div>

      {/* Content - Kanban and Calendar stacked vertically */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Kanban Board at top */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-gray-100">Kanban Board</h4>
          <div className="overflow-y-auto">
            <PersonalKanbanBoard
              tasks={tasks.filter(t => !t.due_date)}
              onTaskMove={handleTaskMove}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleTaskDelete}
              onQuickAdd={handleKanbanQuickAdd}
            />
          </div>
        </div>

        {/* Calendar below */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-gray-100">Calendar</h4>
          <PersonalTaskCalendar
            tasks={tasks}
            onDateSelect={handleDateSelect}
            onTaskDrop={handleTaskDropOnCalendar}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            onTaskMove={handleTaskMove}
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

      {/* Weekly Summary Modal */}
      <WeeklySummaryModal
        isOpen={showWeeklySummary}
        onClose={() => setShowWeeklySummary(false)}
        tasks={tasks}
      />
    </div>
  );
}
