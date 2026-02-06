import { useState } from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { PersonalTask } from '../../lib/types';
import DatePickerModal from './DatePickerModal';

interface TaskQuickInputProps {
  onAdd: (title: string, dueDate?: string, priority?: PersonalTask['priority']) => void;
}

const PRIORITY_CONFIG = {
  low: { color: 'bg-green-500', label: 'L' },
  medium: { color: 'bg-yellow-500', label: 'M' },
  high: { color: 'bg-red-500', label: 'H' },
};

export default function TaskQuickInput({ onAdd }: TaskQuickInputProps) {
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState<PersonalTask['priority']>('medium');
  const [showDatePicker, setShowDatePicker] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) {
      onAdd(input.trim(), undefined, priority);
      setInput('');
      setPriority('medium');
    }
  }

  function handleToday() {
    if (input.trim()) {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      onAdd(input.trim(), dateStr, priority);
      setInput('');
      setPriority('medium');
    }
  }

  function handleSchedule() {
    if (input.trim()) {
      setShowDatePicker(true);
    }
  }

  function handleDateSelected(date: Date) {
    if (input.trim()) {
      const dateStr = date.toISOString().split('T')[0];
      onAdd(input.trim(), dateStr, priority);
      setInput('');
      setPriority('medium');
      setShowDatePicker(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Quick add task..."
          className="flex-1 px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-blue-500 text-sm"
        />

        {/* Priority Toggle Buttons */}
        <div className="flex rounded-lg overflow-hidden border border-[#3a3a3a]">
          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPriority(key as PersonalTask['priority'])}
              className={`
                px-2 py-2 text-xs font-bold transition-all
                ${priority === key
                  ? `${config.color} text-white`
                  : 'bg-[#2a2a2a] text-gray-400 hover:bg-[#3a3a3a]'
                }
              `}
              title={`${key.charAt(0).toUpperCase() + key.slice(1)} Priority`}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* Today Button */}
        <button
          type="button"
          onClick={handleToday}
          disabled={!input.trim()}
          className="px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 rounded-lg hover:bg-[#3a3a3a] hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-1.5"
          title="Schedule for today"
        >
          <Clock size={14} />
          Today
        </button>

        {/* Schedule Button */}
        <button
          type="button"
          onClick={handleSchedule}
          disabled={!input.trim()}
          className="px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] text-gray-300 rounded-lg hover:bg-[#3a3a3a] hover:text-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-1.5"
          title="Pick a date"
        >
          <Calendar size={14} />
          Schedule
        </button>

        {/* Add Task Button */}
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-1.5"
        >
          <Plus size={14} />
          Add
        </button>
      </form>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={handleDateSelected}
      />
    </>
  );
}
