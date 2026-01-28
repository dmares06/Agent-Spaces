import { useEffect, useRef, useState } from 'react';
import type { Agent } from '../../lib/types';
import { User, Globe } from 'lucide-react';

interface AgentMentionDropdownProps {
  agents: Agent[];
  query: string;
  onSelect: (agent: Agent) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export default function AgentMentionDropdown({
  agents,
  query,
  onSelect,
  onClose,
  position,
}: AgentMentionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter agents by query
  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(prev + 1, filteredAgents.length - 1);
          dropdownRef.current?.children[next]?.scrollIntoView({
            block: 'nearest',
          });
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          dropdownRef.current?.children[next]?.scrollIntoView({
            block: 'nearest',
          });
          return next;
        });
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredAgents[selectedIndex]) {
          onSelect(filteredAgents[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredAgents, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    // Click outside to close
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredAgents.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
        minWidth: '200px',
      }}
    >
      {filteredAgents.map((agent, index) => {
        const isGlobal = !agent.workspace_id;
        const isSelected = index === selectedIndex;

        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-muted transition-colors ${
              isSelected ? 'bg-accent/10' : ''
            }`}
          >
            {/* Avatar */}
            {agent.avatar ? (
              <span className="text-lg">{agent.avatar}</span>
            ) : (
              <User size={16} className="text-muted-foreground" />
            )}

            {/* Agent Name */}
            <span className="flex-1 text-sm font-medium">{agent.name}</span>

            {/* Global Badge */}
            {isGlobal && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                <Globe size={10} />
                <span>Global</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
