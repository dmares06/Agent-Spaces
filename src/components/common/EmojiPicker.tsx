import { useEffect, useRef } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const COMMON_EMOJIS = [
  '🤖', '🎯', '⚡', '🚀', '💡', '🔧', '📊', '📈',
  '💻', '🎨', '📝', '🔍', '📚', '🎓', '🏆', '⭐',
  '🔥', '💪', '🎭', '🎪', '🎬', '🎮', '🎲', '🎯',
  '🌟', '✨', '🌈', '🌊', '🌸', '🍀', '🌺', '🌻',
  '🐱', '🐶', '🐼', '🦊', '🦁', '🐯', '🐨', '🐻',
  '🦄', '🐉', '🦋', '🐝', '🐢', '🐠', '🦀', '🦖',
  '👨‍💻', '👩‍💻', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀',
];

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className="absolute z-10 mt-2 w-full bg-card border border-border rounded-lg shadow-lg p-3 max-h-48 overflow-y-auto"
    >
      <div className="grid grid-cols-8 gap-2">
        {COMMON_EMOJIS.map((emoji, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(emoji)}
            className="text-2xl hover:bg-muted rounded p-1 transition-colors"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
