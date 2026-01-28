import { useState } from 'react';
import { PersonalTask } from '../../lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PersonalTaskCalendarProps {
  tasks: PersonalTask[];
  onDateSelect: (date: Date) => void;
  onTaskDrop: (taskId: string, dateStr: string) => void;
}

export default function PersonalTaskCalendar({
  tasks,
  onDateSelect,
  onTaskDrop
}: PersonalTaskCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group tasks by due_date
  const tasksByDate: Record<string, PersonalTask[]> = {};
  tasks.filter(t => t.due_date).forEach(task => {
    if (!tasksByDate[task.due_date!]) {
      tasksByDate[task.due_date!] = [];
    }
    tasksByDate[task.due_date!].push(task);
  });

  function getDaysInMonth(date: Date): Date[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];

    // Add empty cells for days before month starts
    const startDayOfWeek = firstDay.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(year, month, -(startDayOfWeek - i - 1));
      days.push(prevDate);
    }

    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    // Add empty cells for days after month ends
    const endDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - endDayOfWeek; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }

  function formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function isCurrentMonth(date: Date): boolean {
    return date.getMonth() === currentMonth.getMonth() &&
           date.getFullYear() === currentMonth.getFullYear();
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  function handleDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('application/personal-task-id');
    if (taskId) {
      onTaskDrop(taskId, dateStr);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function previousMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  }

  function goToToday() {
    setCurrentMonth(new Date());
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-1 hover:bg-muted rounded"
          title="Previous month"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 bg-accent text-white rounded hover:bg-accent/90"
          >
            Today
          </button>
        </div>

        <button
          onClick={nextMonth}
          className="p-1 hover:bg-muted rounded"
          title="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {dayNames.map(day => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((date, i) => {
          const dateStr = formatDateKey(date);
          const dayTasks = tasksByDate[dateStr] || [];
          const inCurrentMonth = isCurrentMonth(date);
          const today = isToday(date);

          return (
            <div
              key={i}
              className={`border border-border rounded min-h-[80px] p-2 cursor-pointer transition-colors ${
                inCurrentMonth
                  ? 'bg-background hover:bg-muted'
                  : 'bg-muted/30 text-muted-foreground'
              } ${today ? 'ring-2 ring-accent' : ''}`}
              onClick={() => onDateSelect(date)}
              onDrop={(e) => handleDrop(e, dateStr)}
              onDragOver={handleDragOver}
            >
              {/* Date number */}
              <div className={`text-sm font-medium mb-1 ${today ? 'text-accent' : ''}`}>
                {date.getDate()}
              </div>

              {/* Task indicators */}
              {dayTasks.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                  </div>

                  {/* Task dots */}
                  <div className="flex flex-wrap gap-1">
                    {dayTasks.slice(0, 4).map(task => (
                      <div
                        key={task.id}
                        className={`w-2 h-2 rounded-full ${
                          task.status === 'completed'
                            ? 'bg-green-500'
                            : task.status === 'working'
                            ? 'bg-blue-500'
                            : task.status === 'review'
                            ? 'bg-purple-500'
                            : 'bg-gray-400'
                        }`}
                        title={task.title}
                      />
                    ))}
                    {dayTasks.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{dayTasks.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
