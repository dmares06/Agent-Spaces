import { type Task } from '../../lib/types';
import KanbanColumn from './KanbanColumn';
import { electronAPI } from '../../lib/electronAPI';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskDelete?: (taskId: string) => void;
}

const COLUMNS = [
  {
    id: 'todo',
    title: 'To Do',
    status: 'todo' as Task['status'],
    description: 'Tasks assigned but not started',
    color: 'gray',
  },
  {
    id: 'planning',
    title: 'Planning',
    status: 'planning' as Task['status'],
    description: 'Agent analyzing & planning approach',
    color: 'blue',
  },
  {
    id: 'working',
    title: 'Working',
    status: 'working' as Task['status'],
    description: 'Agent actively executing task',
    color: 'yellow',
  },
  {
    id: 'review',
    title: 'Review',
    status: 'review' as Task['status'],
    description: 'Agent validating completed work',
    color: 'purple',
  },
  {
    id: 'needs_input',
    title: 'Needs Input',
    status: 'needs_input' as Task['status'],
    description: 'Blocked, waiting for user',
    color: 'orange',
  },
  {
    id: 'complete',
    title: 'Complete',
    status: 'complete' as Task['status'],
    description: 'Successfully finished',
    color: 'green',
  },
];

export default function KanbanBoard({ tasks, onTaskDelete }: KanbanBoardProps) {
  async function handleTaskDrop(taskId: string, newStatus: Task['status']) {
    try {
      await electronAPI.task.updateStatus(taskId, newStatus);
      // Task update will be broadcast via IPC events
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  }

  // Group tasks by status
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = [];
    }
    acc[task.status].push(task);
    return acc;
  }, {} as Record<Task['status'], Task[]>);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pb-4">
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.id}
          id={column.id}
          title={column.title}
          description={column.description}
          color={column.color}
          status={column.status}
          tasks={tasksByStatus[column.status] || []}
          onTaskDrop={handleTaskDrop}
          onTaskDelete={onTaskDelete}
        />
      ))}
    </div>
  );
}
