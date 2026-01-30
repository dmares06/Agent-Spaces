import { useRef, useState } from 'react';
import { type Task } from '../../lib/types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  description: string;
  color: string;
  status: Task['status'];
  tasks: Task[];
  onTaskDrop: (taskId: string, newStatus: Task['status']) => void;
  onTaskDelete?: (taskId: string) => void;
}

export default function KanbanColumn({
  id: _id,
  title,
  description,
  color,
  status,
  tasks,
  onTaskDrop,
  onTaskDelete,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);

    const taskId = e.dataTransfer.getData('application/task-id');
    if (taskId) {
      onTaskDrop(taskId, status);
    }
  };

  // Color mapping for border and accents
  const colorClasses: Record<string, string> = {
    gray: 'border-gray-500 bg-gray-500/5',
    blue: 'border-blue-500 bg-blue-500/5',
    yellow: 'border-yellow-500 bg-yellow-500/5',
    purple: 'border-purple-500 bg-purple-500/5',
    orange: 'border-orange-500 bg-orange-500/5',
    green: 'border-green-500 bg-green-500/5',
    red: 'border-red-500 bg-red-500/5',
  };

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px]">
      {/* Column Header */}
      <div className={`px-3 py-2 border-l-4 ${colorClasses[color]} rounded-t-lg`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {tasks.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {/* Task Cards */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex-1 p-2 bg-muted/20 rounded-b-lg border-2 border-dashed transition-colors min-h-[200px] space-y-2 ${
          isDragOver ? `${colorClasses[color]} border-opacity-50` : 'border-transparent'
        }`}
      >
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onDelete={onTaskDelete} />
          ))
        )}
      </div>
    </div>
  );
}
