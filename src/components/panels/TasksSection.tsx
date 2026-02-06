import { useState, useEffect } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import { type Task, type Agent } from '../../lib/types';
import TaskItem from './TaskItem';
import KanbanBoard from '../tasks/KanbanBoard';
import { Filter, LayoutList, LayoutGrid, Maximize2, Minimize2 } from 'lucide-react';

interface TasksSectionProps {
  workspaceId?: string;
  chatId?: string;
  onTaskCountChange?: (count: number) => void;
}

type FilterMode = 'all' | 'assigned' | 'created';
type ViewMode = 'list' | 'kanban';

export default function TasksSection({ workspaceId, chatId, onTaskCountChange }: TasksSectionProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadTasks();
    loadAgents();

    // Listen for real-time task updates
    electronAPI.onTaskUpdate(handleTaskUpdate);
    electronAPI.onTaskDeleted(handleTaskDeleted);

    return () => {
      electronAPI.offTaskUpdate();
      electronAPI.offTaskDeleted();
    };
  }, [workspaceId, chatId, filterMode, selectedAgentId]);

  async function loadAgents() {
    try {
      if (workspaceId) {
        const [workspaceAgents, globalAgents] = await Promise.all([
          electronAPI.agent.list(workspaceId),
          electronAPI.agent.listGlobal(),
        ]);
        setAgents([...workspaceAgents, ...globalAgents]);
      } else {
        const globalAgents = await electronAPI.agent.listGlobal();
        setAgents(globalAgents);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  useEffect(() => {
    onTaskCountChange?.(tasks.length);
  }, [tasks.length, onTaskCountChange]);

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
    try {
      setLoading(true);
      const filters: {
        workspaceId?: string;
        chatId?: string;
        assignedToAgentId?: string;
        createdByAgentId?: string;
      } = {};

      if (workspaceId) filters.workspaceId = workspaceId;
      if (chatId) filters.chatId = chatId;

      if (filterMode === 'assigned' && selectedAgentId) {
        filters.assignedToAgentId = selectedAgentId;
      } else if (filterMode === 'created' && selectedAgentId) {
        filters.createdByAgentId = selectedAgentId;
      }

      const data = await electronAPI.task.list(filters);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleTaskUpdate(updatedTask: Task) {
    setTasks((prev) => {
      const index = prev.findIndex((t) => t.id === updatedTask.id);
      if (index >= 0) {
        // Update existing task
        const newTasks = [...prev];
        newTasks[index] = updatedTask;
        return newTasks;
      } else {
        // Add new task (if it matches our filters)
        if ((!workspaceId || updatedTask.workspace_id === workspaceId) &&
            (!chatId || updatedTask.chat_id === chatId)) {
          return [updatedTask, ...prev];
        }
        return prev;
      }
    });
  }

  function handleTaskDeleted(deletedId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
  }

  async function handleDelete(id: string) {
    try {
      await electronAPI.task.delete(id);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-lg">Workspace Tasks - Fullscreen</h3>
            <span className="text-sm text-muted-foreground">Press ESC to exit</span>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-1 border border-border rounded">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-l ${viewMode === 'list' ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                title="List View"
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-r ${viewMode === 'kanban' ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                title="Kanban View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>

            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 hover:bg-muted rounded"
              title="Exit Fullscreen"
            >
              <Minimize2 size={18} />
            </button>
          </div>
        </div>

        {/* Fullscreen Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No tasks yet
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <KanbanBoard tasks={tasks} onTaskDelete={handleDelete} />
          )}
        </div>
      </div>
    );
  }

  // Normal panel mode
  return (
    <div className="space-y-3">
      {/* Filter and View Controls */}
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        {/* Filter Mode */}
        <div className="flex items-center gap-1 flex-1">
          <Filter size={14} className="text-muted-foreground" />
          <select
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value as FilterMode);
              if (e.target.value === 'all') {
                setSelectedAgentId(null);
              }
            }}
            className="flex-1 text-xs bg-background border border-border rounded px-2 py-1 text-foreground"
          >
            <option value="all">All Tasks</option>
            <option value="assigned">Assigned To</option>
            <option value="created">Created By</option>
          </select>
        </div>

        {/* Agent Selector */}
        {(filterMode === 'assigned' || filterMode === 'created') && (
          <select
            value={selectedAgentId || ''}
            onChange={(e) => setSelectedAgentId(e.target.value || null)}
            className="flex-1 text-xs bg-background border border-border rounded px-2 py-1 text-foreground"
          >
            <option value="">Select Agent...</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.avatar} {agent.name}
              </option>
            ))}
          </select>
        )}

        {/* View Toggle */}
        <div className="flex items-center gap-1 border border-border rounded">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded-l ${viewMode === 'list' ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground'}`}
            title="List View"
          >
            <LayoutList size={14} />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1 rounded-r ${viewMode === 'kanban' ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground'}`}
            title="Kanban View"
          >
            <LayoutGrid size={14} />
          </button>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="p-1 hover:bg-muted rounded"
          title="Fullscreen Mode"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          No tasks yet
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <KanbanBoard tasks={tasks} onTaskDelete={handleDelete} />
      )}
    </div>
  );
}
