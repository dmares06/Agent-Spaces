import { useState } from 'react';

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  initialDate?: Date;
}

export default function DatePickerModal({
  isOpen,
  onClose,
  onSelectDate,
  initialDate
}: DatePickerModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(
    initialDate ? new Date(initialDate) : new Date()
  );
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: daysCount }, (_, i) => {
      const day = new Date(year, month, i + 1);
      day.setHours(0, 0, 0, 0);
      return day;
    });
  };

  const getFirstDayOfMonth = (date: Date): number => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isBefore = (date1: Date, date2: Date): boolean => {
    return date1.getTime() < date2.getTime();
  };

  const addMonths = (date: Date, months: number): Date => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
  };

  const addDays = (date: Date, days: number): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  };

  const formatMonth = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDay = (date: Date): string => {
    return date.getDate().toString();
  };

  const daysInMonth = getDaysInMonth(selectedMonth);
  const firstDayOfMonth = getFirstDayOfMonth(selectedMonth);

  const handleDateSelect = (date: Date) => {
    onSelectDate(date);
    onClose();
  };

  const handleQuickSelect = (date: Date) => {
    onSelectDate(date);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 w-[350px]">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedMonth(addMonths(selectedMonth, -1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatMonth(selectedMonth)}
          </span>
          <button
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs text-gray-600 dark:text-gray-400 font-medium py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {/* Empty cells for days before month start */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}

          {/* Date cells */}
          {daysInMonth.map(date => {
            const isToday = isSameDay(date, today);
            const isSelected = initialDate && isSameDay(date, new Date(initialDate));
            const isPast = isBefore(date, today);
            const isHovered = hoveredDate && isSameDay(date, hoveredDate);

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDateSelect(date)}
                onMouseEnter={() => setHoveredDate(date)}
                onMouseLeave={() => setHoveredDate(null)}
                className={`
                  h-10 rounded text-sm font-medium transition-all
                  ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
                  ${isSelected ? 'bg-blue-500 text-white' : ''}
                  ${!isSelected && isHovered ? 'bg-blue-100 dark:bg-blue-900' : ''}
                  ${!isSelected && !isHovered && isPast ? 'text-gray-400 dark:text-gray-600' : ''}
                  ${!isSelected && !isHovered && !isPast ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                `}
              >
                {formatDay(date)}
              </button>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleQuickSelect(today)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            Today
          </button>
          <button
            onClick={() => handleQuickSelect(addDays(today, 1))}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            Tomorrow
          </button>
          <button
            onClick={() => handleQuickSelect(addDays(today, 7))}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            Next Week
          </button>
        </div>
      </div>
    </div>
  );
}
