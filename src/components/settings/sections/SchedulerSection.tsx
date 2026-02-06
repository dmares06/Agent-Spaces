import { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  History,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { electronAPI } from '../../../lib/electronAPI';
import type { ScheduledTask, ScheduledTaskRun } from '../../../lib/types';

// Pre-configured pipeline templates
const PIPELINE_TEMPLATES = [
  {
    name: 'Daily Workflow',
    command: 'daily',
    cron: '0 9 * * 1-5',
    description: 'Run daily workflow at 9 AM on weekdays',
  },
  {
    name: 'Corp Pipeline',
    command: 'run-corp-pipeline',
    cron: '0 9 * * 1',
    description: 'Corporate lead pipeline - Mondays at 9 AM',
  },
  {
    name: 'Athletics Pipeline',
    command: 'run-athletics-pipeline',
    cron: '0 8 * * 0',
    description: 'University athletics pipeline - Sundays at 8 AM',
  },
];

// Common cron expressions
const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'Every Sunday at 8 AM', value: '0 8 * * 0' },
];

interface ScheduleFormData {
  name: string;
  description: string;
  cron_expression: string;
  command: string;
  working_directory: string;
}

export default function SchedulerSection() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    name: '',
    description: '',
    cron_expression: '',
    command: '',
    working_directory: '',
  });
  const [cronValidation, setCronValidation] = useState<{ valid: boolean; error?: string; nextRun?: string } | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [taskHistory, setTaskHistory] = useState<Record<string, ScheduledTaskRun[]>>({});

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const result = await electronAPI.schedule.list();
      setTasks(result);
    } catch (error) {
      console.error('Failed to load scheduled tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateCron = async (expression: string) => {
    if (!expression.trim()) {
      setCronValidation(null);
      return;
    }
    try {
      const result = await electronAPI.schedule.validateCron(expression);
      setCronValidation(result);
    } catch {
      setCronValidation({ valid: false, error: 'Invalid expression' });
    }
  };

  const handleFormChange = (field: keyof ScheduleFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'cron_expression') {
      validateCron(value);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.cron_expression || !formData.command) {
      return;
    }

    try {
      if (editingTask) {
        await electronAPI.schedule.update(editingTask.id, {
          name: formData.name,
          description: formData.description || undefined,
          cron_expression: formData.cron_expression,
          command: formData.command,
          working_directory: formData.working_directory || undefined,
        });
      } else {
        await electronAPI.schedule.create({
          name: formData.name,
          description: formData.description || undefined,
          cron_expression: formData.cron_expression,
          command: formData.command,
          working_directory: formData.working_directory || undefined,
          enabled: 1,
        });
      }

      resetForm();
      loadTasks();
    } catch (error) {
      console.error('Failed to save scheduled task:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      cron_expression: '',
      command: '',
      working_directory: '',
    });
    setCronValidation(null);
    setEditingTask(null);
    setShowForm(false);
  };

  const handleEdit = (task: ScheduledTask) => {
    setFormData({
      name: task.name,
      description: task.description || '',
      cron_expression: task.cron_expression,
      command: task.command,
      working_directory: task.working_directory || '',
    });
    setEditingTask(task);
    setShowForm(true);
    validateCron(task.cron_expression);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled task?')) return;

    try {
      await electronAPI.schedule.delete(id);
      loadTasks();
    } catch (error) {
      console.error('Failed to delete scheduled task:', error);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await electronAPI.schedule.toggle(id);
      loadTasks();
    } catch (error) {
      console.error('Failed to toggle scheduled task:', error);
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      await electronAPI.schedule.runNow(id);
      // Reload to update last_run_at
      loadTasks();
    } catch (error) {
      console.error('Failed to run task:', error);
    }
  };

  const loadHistory = async (taskId: string) => {
    try {
      const history = await electronAPI.schedule.history(taskId, 10);
      setTaskHistory(prev => ({ ...prev, [taskId]: history }));
    } catch (error) {
      console.error('Failed to load task history:', error);
    }
  };

  const toggleHistory = (taskId: string) => {
    if (expandedHistory === taskId) {
      setExpandedHistory(null);
    } else {
      setExpandedHistory(taskId);
      if (!taskHistory[taskId]) {
        loadHistory(taskId);
      }
    }
  };

  const applyTemplate = (template: typeof PIPELINE_TEMPLATES[0]) => {
    setFormData({
      name: template.name,
      description: template.description,
      cron_expression: template.cron,
      command: template.command,
      working_directory: '',
    });
    validateCron(template.cron);
    setShowForm(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Check size={14} className="text-green-500" />;
      case 'failed':
        return <X size={14} className="text-red-500" />;
      case 'running':
        return <RefreshCw size={14} className="text-blue-500 animate-spin" />;
      case 'cancelled':
        return <AlertCircle size={14} className="text-yellow-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Scheduler</h3>
          <p className="text-sm text-muted-foreground">
            Automate MO_Workflow pipeline execution on schedules
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus size={16} />
          New Schedule
        </button>
      </div>

      {/* Pipeline Templates */}
      {!showForm && tasks.length === 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-3">Quick Start Templates</h4>
          <div className="grid gap-2">
            {PIPELINE_TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() => applyTemplate(template)}
                className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:border-accent transition-colors text-left"
              >
                <div>
                  <div className="font-medium text-foreground">{template.name}</div>
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                </div>
                <Terminal size={16} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-foreground">
            {editingTask ? 'Edit Schedule' : 'Create New Schedule'}
          </h4>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="Daily Workflow"
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Optional description"
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Command</label>
              <input
                type="text"
                value={formData.command}
                onChange={(e) => handleFormChange('command', e.target.value)}
                placeholder="daily or run-corp-pipeline"
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Cron Expression
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.cron_expression}
                  onChange={(e) => handleFormChange('cron_expression', e.target.value)}
                  placeholder="0 9 * * 1-5"
                  className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                />
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleFormChange('cron_expression', e.target.value);
                    }
                  }}
                  className="px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  value=""
                >
                  <option value="">Presets...</option>
                  {CRON_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
              {cronValidation && (
                <div className={`mt-1 text-xs ${cronValidation.valid ? 'text-green-500' : 'text-red-500'}`}>
                  {cronValidation.valid
                    ? `Next run: ${formatDate(cronValidation.nextRun)}`
                    : cronValidation.error}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Working Directory (optional)
              </label>
              <input
                type="text"
                value={formData.working_directory}
                onChange={(e) => handleFormChange('working_directory', e.target.value)}
                placeholder="Leave empty for home directory"
                className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.cron_expression || !formData.command || (cronValidation !== null && !cronValidation.valid)}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editingTask ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Task List */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(task.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        task.enabled
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      title={task.enabled ? 'Disable' : 'Enable'}
                    >
                      {task.enabled ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                    <div>
                      <div className="font-medium text-foreground">{task.name}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground">{task.description}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunNow(task.id)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="Run Now"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      onClick={() => toggleHistory(task.id)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="View History"
                    >
                      <History size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(task)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Clock size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-muted rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Terminal size={12} />
                    <code className="bg-muted px-1 rounded">{task.command}</code>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <code className="bg-muted px-1 rounded">{task.cron_expression}</code>
                  </div>
                  {task.next_run_at && task.enabled && (
                    <div>Next: {formatDate(task.next_run_at)}</div>
                  )}
                  {task.last_run_at && <div>Last: {formatDate(task.last_run_at)}</div>}
                </div>
              </div>

              {/* History Panel */}
              {expandedHistory === task.id && (
                <div className="border-t border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {expandedHistory === task.id ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                    <span className="text-sm font-medium text-foreground">Execution History</span>
                  </div>

                  {taskHistory[task.id]?.length > 0 ? (
                    <div className="space-y-2">
                      {taskHistory[task.id].map((run) => (
                        <div
                          key={run.id}
                          className="flex items-center justify-between py-2 px-3 bg-card rounded border border-border text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(run.status)}
                            <span className="text-foreground capitalize">{run.status}</span>
                          </div>
                          <div className="text-muted-foreground">
                            {formatDate(run.started_at)}
                            {run.exit_code !== undefined && run.exit_code !== null && (
                              <span className="ml-2">(exit: {run.exit_code})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">No execution history yet</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!showForm && tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock size={48} className="mx-auto mb-4 opacity-50" />
          <p>No scheduled tasks yet</p>
          <p className="text-sm">Create a schedule to automate your workflows</p>
        </div>
      )}
    </div>
  );
}
