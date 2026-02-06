import { useState, useEffect, useRef, useCallback } from 'react';
import { Command, Sparkles, X } from 'lucide-react';
import { type SlashCommand } from '../../lib/electronAPI';

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  query: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export default function SlashCommandMenu({
  commands,
  query,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  const filteredCommands = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (filteredCommands.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev === 0 ? filteredCommands.length - 1 : prev - 1
          );
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const selectedElement = menu.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (filteredCommands.length === 0) {
    return (
      <div
        className="absolute z-50 bg-card border border-border rounded-lg shadow-lg p-3 w-64"
        style={{
          bottom: '100%',
          left: 0,
          marginBottom: '8px',
        }}
      >
        <div className="text-sm text-muted-foreground text-center">
          No commands found for "{query}"
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden w-80 max-h-64 overflow-y-auto"
      style={{
        bottom: '100%',
        left: 0,
        marginBottom: '8px',
      }}
    >
      <div className="p-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Command size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Slash Commands
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-background/80 transition-colors"
        >
          <X size={12} className="text-muted-foreground" />
        </button>
      </div>
      <div className="py-1">
        {filteredCommands.map((command, index) => (
          <button
            key={`${command.type}-${command.name}`}
            data-index={index}
            onClick={() => onSelect(command)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full text-left px-3 py-2 flex items-start gap-3 transition-colors ${
              index === selectedIndex
                ? 'bg-accent/10 text-accent'
                : 'hover:bg-muted/50 text-foreground'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {command.type === 'skill' ? (
                <Sparkles size={14} className="text-accent" />
              ) : (
                <Command size={14} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">
                  /{command.name}
                </span>
                {command.type === 'skill' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                    skill
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {command.description}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="p-2 border-t border-border bg-muted/30">
        <div className="text-[10px] text-muted-foreground text-center">
          <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">↑↓</kbd>
          {' '}navigate{' '}
          <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">Enter</kbd>
          {' '}select{' '}
          <kbd className="px-1 py-0.5 bg-background rounded text-[10px]">Esc</kbd>
          {' '}close
        </div>
      </div>
    </div>
  );
}
