import { PersonalTask } from '../../lib/types';
import PersonalTaskCard from './PersonalTaskCard';
import { useState } from 'react';

interface PersonalKanbanColumnProps {
  title: string;
  color: string;
  tasks: PersonalTask[];
  status: PersonalTask['status'];
  onDrop: (taskId: string) => void;
  onTaskEdit: (task: PersonalTask) => void;
  onTaskDelete: (taskId: string) => void;
}

const colorClasses = {
  gray: 'border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-900',
  blue: 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900',
  purple: 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900',
  green: 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900'
};

export default function PersonalKanbanColumn({
  title,
  color,
  tasks,
  onDrop,
  onTaskEdit,
  onTaskDelete
}: PersonalKanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

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

  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.gray;

  return (
    <div
      className={`flex flex-col h-full border-2 rounded-lg p-3 ${colorClass} ${
        isDragOver ? 'ring-2 ring-offset-2 ring-blue-500' : ''
      } transition-all`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="mb-3">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
          {title}
        </h3>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {tasks.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            {isDragOver ? 'Drop task here' : 'No tasks'}
          </div>
        ) : (
          tasks.map(task => (
            <PersonalTaskCard
              key={task.id}
              task={task}
              onEdit={onTaskEdit}
              onDelete={onTaskDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
