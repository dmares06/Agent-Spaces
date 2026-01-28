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
    <div className="grid grid-cols-4 gap-4">
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
