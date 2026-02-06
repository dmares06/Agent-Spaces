import { useState, useEffect } from 'react';
import { Bell, X, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { PersonalTask } from '../../lib/types';

interface TaskNotificationsProps {
  tasks: PersonalTask[];
  onTaskClick: (task: PersonalTask) => void;
}

interface Notification {
  id: string;
  task: PersonalTask;
  type: 'due-today' | 'due-soon' | 'overdue';
  message: string;
}

export default function TaskNotifications({ tasks, onTaskClick }: TaskNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newNotifications: Notification[] = [];

    tasks.forEach(task => {
      if (task.status === 'completed' || !task.due_date || dismissedIds.has(task.id)) {
        return;
      }

      const dueDate = task.due_date;

      if (dueDate < today) {
        // Overdue
        newNotifications.push({
          id: `overdue-${task.id}`,
          task,
          type: 'overdue',
          message: `Overdue: ${task.title}`,
        });
      } else if (dueDate === today) {
        // Due today
        newNotifications.push({
          id: `today-${task.id}`,
          task,
          type: 'due-today',
          message: `Due today: ${task.title}`,
        });
      } else if (dueDate <= threeDays) {
        // Due soon (within 3 days)
        const daysUntil = Math.ceil(
          (new Date(dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
        newNotifications.push({
          id: `soon-${task.id}`,
          task,
          type: 'due-soon',
          message: `Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}: ${task.title}`,
        });
      }
    });

    // Sort by urgency: overdue > due-today > due-soon
    newNotifications.sort((a, b) => {
      const priority = { 'overdue': 0, 'due-today': 1, 'due-soon': 2 };
      return priority[a.type] - priority[b.type];
    });

    setNotifications(newNotifications);
  }, [tasks, dismissedIds]);

  function dismissNotification(notificationId: string, taskId: string) {
    setDismissedIds(prev => new Set([...prev, taskId]));
  }

  const unreadCount = notifications.length;
  const hasUrgent = notifications.some(n => n.type === 'overdue' || n.type === 'due-today');

  if (unreadCount === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`
          relative p-2 rounded-lg transition-colors
          ${hasUrgent
            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
            : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
          }
        `}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className={`
            absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center
            text-xs font-bold text-white rounded-full
            ${hasUrgent ? 'bg-red-500' : 'bg-amber-500'}
          `}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-[#3a3a3a]">
              <span className="font-semibold text-gray-100">Notifications</span>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 hover:bg-[#2a2a2a] rounded"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 hover:bg-[#2a2a2a] transition-colors border-b border-[#2a2a2a] last:border-0"
                >
                  <div className={`
                    mt-0.5 p-1.5 rounded-full
                    ${notification.type === 'overdue' ? 'bg-red-500/20 text-red-400' : ''}
                    ${notification.type === 'due-today' ? 'bg-amber-500/20 text-amber-400' : ''}
                    ${notification.type === 'due-soon' ? 'bg-blue-500/20 text-blue-400' : ''}
                  `}>
                    {notification.type === 'overdue' && <AlertTriangle size={14} />}
                    {notification.type === 'due-today' && <Clock size={14} />}
                    {notification.type === 'due-soon' && <Clock size={14} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => {
                        onTaskClick(notification.task);
                        setShowPanel(false);
                      }}
                      className="text-left w-full"
                    >
                      <p className="text-sm text-gray-100 font-medium truncate">
                        {notification.task.title}
                      </p>
                      <p className={`text-xs mt-0.5
                        ${notification.type === 'overdue' ? 'text-red-400' : ''}
                        ${notification.type === 'due-today' ? 'text-amber-400' : ''}
                        ${notification.type === 'due-soon' ? 'text-blue-400' : ''}
                      `}>
                        {notification.type === 'overdue' && 'Overdue'}
                        {notification.type === 'due-today' && 'Due today'}
                        {notification.type === 'due-soon' && `Due ${new Date(notification.task.due_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </p>
                    </button>
                  </div>

                  <button
                    onClick={() => dismissNotification(notification.id, notification.task.id)}
                    className="p-1 hover:bg-[#3a3a3a] rounded text-gray-500 hover:text-gray-300"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
