# Personal Task Board - Agent-Workspace Implementation Plan

## ✅ Step 1: Types Added
Already completed - `PersonalTask` interface added to `src/lib/types.ts`

## 📋 Remaining Implementation Steps

### Step 2: Database Schema & Functions

**File:** `electron/database/db.ts`

Add personal_tasks table to the database initialization:

```typescript
// Add to initializeDatabase() function
db.exec(`
  CREATE TABLE IF NOT EXISTS personal_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'working', 'review', 'completed')),
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),

    -- Date/time tracking
    due_date TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    started_at TEXT,
    reminder_time TEXT,

    -- Organization
    workspace_id TEXT,
    tags TEXT,
    notes TEXT,

    -- Agent tracking
    created_by_agent_id TEXT,
    last_modified_by_agent_id TEXT,
    last_notified_at TEXT,

    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    FOREIGN KEY (last_modified_by_agent_id) REFERENCES agents(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_personal_tasks_status ON personal_tasks(status);
  CREATE INDEX IF NOT EXISTS idx_personal_tasks_workspace ON personal_tasks(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_personal_tasks_due_date ON personal_tasks(due_date);
`);
```

Add CRUD functions:

```typescript
export function createPersonalTask(data: Omit<PersonalTask, 'id' | 'created_at'>): PersonalTask {
  const id = `ptask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO personal_tasks (
      id, title, description, status, priority,
      due_date, created_at, workspace_id, tags, notes,
      created_by_agent_id, last_modified_by_agent_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.title, data.description, data.status, data.priority,
    data.due_date, now, data.workspace_id, data.tags, data.notes,
    data.created_by_agent_id, data.last_modified_by_agent_id
  );

  return getPersonalTask(id)!;
}

export function getAllPersonalTasks(filters?: {
  status?: string;
  workspace_id?: string;
  priority?: string;
}): PersonalTask[] {
  let query = 'SELECT * FROM personal_tasks WHERE 1=1';
  const params: any[] = [];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.workspace_id) {
    query += ' AND workspace_id = ?';
    params.push(filters.workspace_id);
  }
  if (filters?.priority) {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }

  query += ' ORDER BY created_at DESC';

  return db.prepare(query).all(...params) as PersonalTask[];
}

export function getPersonalTask(id: string): PersonalTask | null {
  return db.prepare('SELECT * FROM personal_tasks WHERE id = ?').get(id) as PersonalTask | null;
}

export function updatePersonalTask(id: string, updates: Partial<PersonalTask>): PersonalTask {
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'created_at' && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE personal_tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getPersonalTask(id)!;
}

export function updatePersonalTaskStatus(
  id: string,
  status: PersonalTask['status'],
  agentId?: string
): PersonalTask {
  const updates: Partial<PersonalTask> = { status };

  if (status === 'completed' && !updates.completed_at) {
    updates.completed_at = new Date().toISOString();
  } else if (status === 'working' && !updates.started_at) {
    updates.started_at = new Date().toISOString();
  }

  if (agentId) {
    updates.last_modified_by_agent_id = agentId;
  }

  return updatePersonalTask(id, updates);
}

export function deletePersonalTask(id: string): void {
  db.prepare('DELETE FROM personal_tasks WHERE id = ?').run(id);
}

export function getPersonalTaskStats(): {
  total: number;
  todo: number;
  working: number;
  review: number;
  completed: number;
  overdue: number;
  dueToday: number;
} {
  const allTasks = getAllPersonalTasks();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  const stats = {
    total: allTasks.length,
    todo: 0,
    working: 0,
    review: 0,
    completed: 0,
    overdue: 0,
    dueToday: 0
  };

  allTasks.forEach(task => {
    stats[task.status]++;

    if (task.due_date && task.status !== 'completed') {
      const dueDate = new Date(task.due_date);
      if (dueDate < now) {
        stats.overdue++;
      } else if (task.due_date === today) {
        stats.dueToday++;
      }
    }
  });

  return stats;
}
```

### Step 3: IPC Handlers

**File:** `electron/ipc/handlers.ts`

Add IPC handlers for personal tasks:

```typescript
// Personal Task Management
ipcMain.handle('personal-task:list', async (_, filters?: { status?: string; workspace_id?: string; priority?: string }) => {
  return db.getAllPersonalTasks(filters);
});

ipcMain.handle('personal-task:create', async (_, data: Omit<PersonalTask, 'id' | 'created_at'>) => {
  const task = db.createPersonalTask(data);
  mainWindow?.webContents.send('personal-task-created', task);
  return task;
});

ipcMain.handle('personal-task:update', async (_, id: string, updates: Partial<PersonalTask>) => {
  const task = db.updatePersonalTask(id, updates);
  mainWindow?.webContents.send('personal-task-updated', task);
  return task;
});

ipcMain.handle('personal-task:update-status', async (_, id: string, status: PersonalTask['status'], agentId?: string) => {
  const task = db.updatePersonalTaskStatus(id, status, agentId);
  mainWindow?.webContents.send('personal-task-updated', task);
  return task;
});

ipcMain.handle('personal-task:delete', async (_, id: string) => {
  db.deletePersonalTask(id);
  mainWindow?.webContents.send('personal-task-deleted', id);
});

ipcMain.handle('personal-task:stats', async () => {
  return db.getPersonalTaskStats();
});
```

### Step 4: ElectronAPI Interface

**File:** `src/lib/electronAPI.ts`

Add to the electronAPI object:

```typescript
personalTask: {
  list: (filters?) => ipcRenderer.invoke('personal-task:list', filters),
  create: (data) => ipcRenderer.invoke('personal-task:create', data),
  update: (id, updates) => ipcRenderer.invoke('personal-task:update', id, updates),
  updateStatus: (id, status, agentId?) => ipcRenderer.invoke('personal-task:update-status', id, status, agentId),
  delete: (id) => ipcRenderer.invoke('personal-task:delete', id),
  getStats: () => ipcRenderer.invoke('personal-task:stats'),

  // Event listeners
  onTaskCreated: (callback: (task: PersonalTask) => void) => {
    ipcRenderer.on('personal-task-created', (_, task) => callback(task));
  },
  onTaskUpdated: (callback: (task: PersonalTask) => void) => {
    ipcRenderer.on('personal-task-updated', (_, task) => callback(task));
  },
  onTaskDeleted: (callback: (id: string) => void) => {
    ipcRenderer.on('personal-task-deleted', (_, id) => callback(id));
  },
  offTaskCreated: () => ipcRenderer.removeAllListeners('personal-task-created'),
  offTaskUpdated: () => ipcRenderer.removeAllListeners('personal-task-updated'),
  offTaskDeleted: () => ipcRenderer.removeAllListeners('personal-task-deleted'),
},
```

### Step 5: Create PersonalTasksPanel Component

**File:** `src/components/personalTasks/PersonalTasksPanel.tsx`

```typescript
import { useState, useEffect } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import { PersonalTask } from '../../lib/types';
import PersonalKanbanBoard from './PersonalKanbanBoard';
import PersonalTaskCalendar from './PersonalTaskCalendar';
import TaskQuickInput from './TaskQuickInput';
import TaskDetailsModal from './TaskDetailsModal';
import { LayoutGrid, Calendar, X } from 'lucide-react';

interface PersonalTasksPanelProps {
  height: number;
  onResize: (newHeight: number) => void;
  onClose: () => void;
}

export default function PersonalTasksPanel({ height, onResize, onClose }: PersonalTasksPanelProps) {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [view, setView] = useState<'kanban' | 'calendar'>('kanban');
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

  async function handleTaskEdit(task: PersonalTask) {
    setSelectedTask(task);
    setIsModalOpen(true);
  }

  async function handleTaskDelete(taskId: string) {
    if (confirm('Delete this task?')) {
      await electronAPI.personalTask.delete(taskId);
    }
  }

  async function handleTaskSave(updates: Partial<PersonalTask>) {
    if (selectedTask) {
      await electronAPI.personalTask.update(selectedTask.id, updates);
    } else {
      await electronAPI.personalTask.create(updates as Omit<PersonalTask, 'id' | 'created_at'>);
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
          <h3 className="font-semibold text-sm">Personal Tasks</h3>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Total: <strong>{stats.total}</strong></span>
            {stats.dueToday > 0 && (
              <span className="text-blue-600">Due Today: <strong>{stats.dueToday}</strong></span>
            )}
            {stats.overdue > 0 && (
              <span className="text-red-600">Overdue: <strong>{stats.overdue}</strong></span>
            )}
          </div>
        </div>

        {/* View Toggle + Close */}
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={`px-2 py-1 text-xs ${view === 'kanban' ? 'bg-accent text-white' : 'hover:bg-muted'}`}
              title="Kanban View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-2 py-1 text-xs ${view === 'calendar' ? 'bg-accent text-white' : 'hover:bg-muted'}`}
              title="Calendar View"
            >
              <Calendar size={14} />
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1 bg-accent text-white rounded text-xs font-medium hover:bg-accent/90"
          >
            + New Task
          </button>

          <button onClick={onClose} className="p-1 hover:bg-muted rounded" title="Close">
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
        {view === 'kanban' ? (
          <PersonalKanbanBoard
            tasks={tasks}
            onTaskMove={handleTaskMove}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
          />
        ) : (
          <PersonalTaskCalendar
            tasks={tasks}
            onDateSelect={(date) => {
              setSelectedTask({
                id: '',
                title: '',
                status: 'todo',
                priority: 'medium',
                due_date: date.toISOString().split('T')[0],
                created_at: new Date().toISOString()
              });
              setIsModalOpen(true);
            }}
            onTaskDrop={async (taskId, dateStr) => {
              await electronAPI.personalTask.update(taskId, { due_date: dateStr });
            }}
          />
        )}
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
```

### Step 6: Copy Component Files

Copy these components from the multi-agent-chatbot implementation:
- `PersonalKanbanBoard.tsx`
- `PersonalKanbanColumn.tsx`
- `PersonalTaskCard.tsx`
- `PersonalTaskCalendar.tsx`
- `TaskQuickInput.tsx`
- `TaskDetailsModal.tsx`

All go in: `src/components/personalTasks/`

### Step 7: Add Button to TopNavigationBar

**File:** `src/components/navigation/TopNavigationBar.tsx`

Add props:
```typescript
showPersonalTasks: boolean;
onPersonalTasksToggle: () => void;
```

Add button in the center section (around line 115):
```typescript
<button
  onClick={onPersonalTasksToggle}
  className={`p-2 rounded-md border-2 transition-all ${
    showPersonalTasks
      ? 'border-orange-500 text-orange-500 bg-orange-50 dark:bg-orange-950'
      : 'border-border text-foreground hover:border-orange-500 hover:text-orange-500'
  }`}
  title="Personal Tasks"
>
  <CheckSquare size={16} />
</button>
```

Import CheckSquare from lucide-react.

### Step 8: Wire Up in WorkspacePage

**File:** `src/pages/WorkspacePage.tsx`

Add state:
```typescript
const [showPersonalTasks, setShowPersonalTasks] = useState(false);
const [personalTasksHeight, setPersonalTasksHeight] = useState(300);
```

Pass to TopNavigationBar:
```typescript
showPersonalTasks={showPersonalTasks}
onPersonalTasksToggle={() => setShowPersonalTasks(!showPersonalTasks)}
```

Add to render (after CanvasPanel):
```typescript
{showPersonalTasks && (
  <PersonalTasksPanel
    height={personalTasksHeight}
    onResize={setPersonalTasksHeight}
    onClose={() => setShowPersonalTasks(false)}
  />
)}
```

## 🎯 Summary

This adds a **Personal Task Management Board** to Agent-Workspace with:
- ✅ 4-column Kanban: Want to Get Done → Working On → Needs Review → Completed
- ✅ Calendar view with drag-and-drop
- ✅ Quick add input
- ✅ Full task editor
- ✅ Real-time updates
- ✅ Task statistics
- ✅ SQLite persistence
- ✅ Toggle button in top nav (like Terminal/Preview/Canvas)

Would you like me to implement these steps now?
