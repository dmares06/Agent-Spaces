import React, { useState, useRef, useEffect } from 'react';
import { Chat, ChatStatus, CHAT_STATUS_CONFIG } from '../../lib/types';

interface ChatStatusDropdownProps {
  chat: Chat;
  onStatusChange?: (status: ChatStatus) => void;
}

export function ChatStatusDropdown({ chat, onStatusChange }: ChatStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentStatus = chat.status || 'active';
  const currentConfig = CHAT_STATUS_CONFIG.find((c) => c.id === currentStatus) || CHAT_STATUS_CONFIG[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleStatusChange = async (status: ChatStatus) => {
    try {
      await window.electronAPI.chat.updateStatus(chat.id, status);
      onStatusChange?.(status);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update chat status:', error);
    }
  };

  const getStatusColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
      purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
      green: 'bg-green-100 text-green-700 hover:bg-green-200',
      slate: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    };
    return colors[color] || colors.gray;
  };

  const getStatusBorderColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'border-blue-200',
      gray: 'border-gray-200',
      yellow: 'border-yellow-200',
      purple: 'border-purple-200',
      green: 'border-green-200',
      slate: 'border-slate-200',
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${getStatusColor(currentConfig.color)} ${getStatusBorderColor(currentConfig.color)}`}
      >
        <span className="text-xs">{currentConfig.label}</span>
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 right-0">
          {CHAT_STATUS_CONFIG.map((config) => (
            <button
              key={config.id}
              onClick={() => handleStatusChange(config.id)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                config.id === currentStatus
                  ? 'bg-gray-100 font-medium'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${config.color === 'blue' ? 'bg-blue-500' : config.color === 'gray' ? 'bg-gray-500' : config.color === 'yellow' ? 'bg-yellow-500' : config.color === 'purple' ? 'bg-purple-500' : config.color === 'green' ? 'bg-green-500' : 'bg-slate-500'}`} />
              <span className="text-gray-900">{config.label}</span>
              {config.id === currentStatus && (
                <svg
                  className="w-4 h-4 ml-auto text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
