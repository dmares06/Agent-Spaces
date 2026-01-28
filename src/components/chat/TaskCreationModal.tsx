import { useState } from 'react';
import { X, User } from 'lucide-react';
import type { Agent } from '../../lib/types';
import { electronAPI } from '../../lib/electronAPI';

interface TaskCreationModalProps {
  mentionedAgents: Agent[];
  workspaceId: string;
  onClose: () => void;
  onTasksCreated?: () => void;
}

interface TaskDraft {
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  title: string;
  description: string;
}

export default function TaskCreationModal({
  mentionedAgents,
  workspaceId,
  onClose,
  onTasksCreated,
}: TaskCreationModalProps) {
  const [tasks, setTasks] = useState<TaskDraft[]>(
    mentionedAgents.map((agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      agentAvatar: agent.avatar,
      title: '',
      description: '',
    }))
  );
  const [creating, setCreating] = useState(false);

  function updateTask(index: number, field: 'title' | 'description', value: string) {
    setTasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    try {
      setCreating(true);

      // Filter out tasks with empty titles
      const validTasks = tasks.filter((task) => task.title.trim());

      if (validTasks.length === 0) {
        onClose();
        return;
      }

      // Create all tasks
      await Promise.all(
        validTasks.map((task) =>
          electronAPI.task.create({
            workspace_id: workspaceId,
            assigned_to_agent_id: task.agentId,
            title: task.title,
            description: task.description || undefined,
          })
        )
      );

      onTasksCreated?.();
      onClose();
    } catch (error) {
      console.error('Failed to create tasks:', error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Create Tasks for Mentioned Agents</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Task Forms */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No agents to create tasks for.</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            tasks.map((task, index) => (
              <div key={task.agentId} className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                {/* Agent Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {task.agentAvatar ? (
                      <span className="text-xl">{task.agentAvatar}</span>
                    ) : (
                      <User size={20} className="text-muted-foreground" />
                    )}
                    <span className="font-medium">@{task.agentName}</span>
                  </div>
                  <button
                    onClick={() => removeTask(index)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {/* Title Input */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => updateTask(index, 'title', e.target.value)}
                    placeholder="What should this agent do?"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>

                {/* Description Input */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={task.description}
                    onChange={(e) => updateTask(index, 'description', e.target.value)}
                    placeholder="Additional context or requirements..."
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {tasks.length > 0 && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={creating}
            >
              Skip
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || tasks.every((t) => !t.title.trim())}
              className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : `Create ${tasks.filter((t) => t.title.trim()).length} Task(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
