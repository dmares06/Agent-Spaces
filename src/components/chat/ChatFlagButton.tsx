import React from 'react';
import { Chat } from '../../lib/types';

interface ChatFlagButtonProps {
  chat: Chat;
  onFlagToggle?: (isFlagged: boolean) => void;
}

export function ChatFlagButton({ chat, onFlagToggle }: ChatFlagButtonProps) {
  const isFlagged = chat.is_flagged === 1;

  const handleToggle = async () => {
    try {
      await window.electronAPI.chat.toggleFlag(chat.id);
      onFlagToggle?.(!isFlagged);
    } catch (error) {
      console.error('Failed to toggle chat flag:', error);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-1.5 rounded transition-colors ${
        isFlagged
          ? 'text-yellow-500 hover:bg-yellow-50'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}
      title={isFlagged ? 'Remove flag' : 'Flag this chat'}
    >
      <svg
        className="w-4 h-4"
        fill={isFlagged ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
        />
      </svg>
    </button>
  );
}
