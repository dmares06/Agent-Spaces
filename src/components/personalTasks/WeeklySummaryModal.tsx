import { useState, useEffect } from 'react';
import { X, CheckCircle, TrendingUp, Calendar, Award } from 'lucide-react';
import { PersonalTask } from '../../lib/types';

interface WeeklySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: PersonalTask[];
}

interface WeeklySummary {
  completedTasks: PersonalTask[];
  totalCompleted: number;
  weekStart: Date;
  weekEnd: Date;
  byDay: Record<string, PersonalTask[]>;
}

function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WeeklySummaryModal({ isOpen, onClose, tasks }: WeeklySummaryModalProps) {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const { start, end } = getWeekBounds();

    // Filter tasks completed this week
    const completedTasks = tasks.filter(task => {
      if (task.status !== 'completed' || !task.completed_at) return false;
      const completedDate = new Date(task.completed_at);
      return completedDate >= start && completedDate <= end;
    });

    // Sort by completion date
    completedTasks.sort((a, b) =>
      new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime()
    );

    // Group by day
    const byDay: Record<string, PersonalTask[]> = {};
    completedTasks.forEach(task => {
      const day = DAYS[new Date(task.completed_at!).getDay()];
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(task);
    });

    setSummary({
      completedTasks,
      totalCompleted: completedTasks.length,
      weekStart: start,
      weekEnd: end,
      byDay,
    });
  }, [isOpen, tasks]);

  if (!isOpen || !summary) return null;

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = summary.weekStart.toLocaleDateString('en-US', options);
    const endStr = summary.weekEnd.toLocaleDateString('en-US', options);
    return `${startStr} - ${endStr}`;
  };

  const getMotivationalMessage = () => {
    if (summary.totalCompleted === 0) return "No tasks completed yet. You've got this! 💪";
    if (summary.totalCompleted < 3) return "Good start! Keep the momentum going! 🚀";
    if (summary.totalCompleted < 7) return "Great progress this week! 🌟";
    if (summary.totalCompleted < 15) return "Fantastic work! You're crushing it! 🔥";
    return "Incredible productivity! You're a machine! 🏆";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3a3a3a]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Award size={20} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Weekly Summary</h2>
              <p className="text-xs text-gray-400">{formatDateRange()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-[#3a3a3a] bg-[#151515]">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle size={24} className="text-green-400" />
                <span className="text-3xl font-bold text-gray-100">{summary.totalCompleted}</span>
              </div>
              <p className="text-sm text-gray-400">Tasks Completed</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp size={24} className="text-blue-400" />
                <span className="text-3xl font-bold text-gray-100">
                  {Math.round(summary.totalCompleted / 7 * 10) / 10}
                </span>
              </div>
              <p className="text-sm text-gray-400">Per Day Avg</p>
            </div>
          </div>
          <p className="text-center mt-4 text-sm text-gray-300">
            {getMotivationalMessage()}
          </p>
        </div>

        {/* Task List by Day */}
        <div className="flex-1 overflow-y-auto p-4">
          {summary.totalCompleted === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>No completed tasks this week yet.</p>
              <p className="text-sm mt-2">Keep working on your tasks!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {DAYS.map(day => {
                const dayTasks = summary.byDay[day] || [];
                if (dayTasks.length === 0) return null;

                return (
                  <div key={day}>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                      <Calendar size={14} />
                      {day}
                      <span className="text-xs bg-[#2a2a2a] px-2 py-0.5 rounded">
                        {dayTasks.length}
                      </span>
                    </h3>
                    <div className="space-y-1.5">
                      {dayTasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-2 bg-[#2a2a2a] rounded-lg"
                        >
                          <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                          <span className="text-sm text-gray-200 line-through opacity-75">
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#3a3a3a]">
          <button
            onClick={onClose}
            className="w-full py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-200 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
