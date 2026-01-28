import { useRef, useState } from 'react';
import type { Agent } from '../../lib/types';
import { Settings, GripVertical, Folder } from 'lucide-react';

interface AgentListProps {
  agents: Agent[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onSettingsClick?: (agent: Agent) => void;
  draggable?: boolean;
  onDragStart?: (agent: Agent) => void;
  onTaskDrop?: (taskId: string, agentId: string) => void;
}

export default function AgentList({
  agents,
  selectedId,
  onSelect,
  onSettingsClick,
  draggable = false,
  onDragStart,
  onTaskDrop,
}: AgentListProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragCounter = useRef<Record<string, number>>({});
  if (agents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          No agents yet. Import a folder to get started.
        </p>
      </div>
    );
  }

  // Group agents by category
  const categorized = agents.reduce((acc, agent) => {
    // Use the new category column, fallback to config.category, then 'Uncategorized'
    let category = agent.category;

    // If no direct category, try to parse from config for backward compatibility
    if (!category && agent.config) {
      try {
        const config = JSON.parse(agent.config);
        category = config.category;
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // Use 'Uncategorized' for agents without category
    category = category || 'Uncategorized';

    if (!acc[category]) acc[category] = [];
    acc[category].push(agent);
    return acc;
  }, {} as Record<string, Agent[]>);

  // Sort categories: put 'Uncategorized' at the end, alphabetize the rest
  const categories = Object.keys(categorized).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">
          Agents
        </h3>
        <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full">
          {agents.length}
        </span>
      </div>

      {categories.map((category) => (
        <div key={category}>
          {categories.length > 1 && (
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2 bg-muted/30 rounded-lg">
              <Folder size={14} className="text-accent flex-shrink-0" />
              <span className="text-sm font-semibold text-foreground flex-1">
                {category}
              </span>
              <span className="text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">
                {categorized[category].length}
              </span>
            </div>
          )}
          <div className="space-y-2">
            {categorized[category].map((agent) => {
              const isSelected = agent.id === selectedId;
              const isDragOver = dragOverId === agent.id;

              const handleDragEnter = (e: React.DragEvent) => {
                e.preventDefault();
                const taskId = e.dataTransfer.types.includes('application/task-id');
                if (taskId) {
                  dragCounter.current[agent.id] = (dragCounter.current[agent.id] || 0) + 1;
                  setDragOverId(agent.id);
                }
              };

              const handleDragLeave = (e: React.DragEvent) => {
                e.preventDefault();
                dragCounter.current[agent.id] = (dragCounter.current[agent.id] || 0) - 1;
                if (dragCounter.current[agent.id] === 0) {
                  setDragOverId(null);
                }
              };

              const handleDragOver = (e: React.DragEvent) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              };

              const handleDrop = async (e: React.DragEvent) => {
                e.preventDefault();
                dragCounter.current[agent.id] = 0;
                setDragOverId(null);

                const taskId = e.dataTransfer.getData('application/task-id');
                if (taskId && onTaskDrop) {
                  onTaskDrop(taskId, agent.id);
                }
              };

              return (
                <div
                  key={agent.id}
                  draggable={draggable}
                  onDragStart={(e) => {
                    if (draggable) {
                      e.dataTransfer.setData('application/agent-id', agent.id);
                      e.dataTransfer.effectAllowed = 'move';
                      console.log('[AgentList] Drag started for agent:', agent.id, agent.name);
                      onDragStart?.(agent);
                    }
                  }}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all group leading-relaxed focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-background ${
                    isSelected
                      ? 'bg-accent/5 border-l-2 border-l-accent'
                      : isDragOver
                      ? 'bg-accent/20 border-2 border-accent border-dashed'
                      : 'hover:bg-background/80 border-l-2 border-l-transparent'
                  } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {draggable && (
                      <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-50 transition-opacity">
                        <GripVertical size={18} className="text-muted-foreground/70" />
                      </div>
                    )}
                    <button
                      onClick={() => onSelect(agent.id)}
                      className="text-lg flex-shrink-0 mt-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                    >
                      {agent.avatar || '🤖'}
                    </button>
                    <button
                      onClick={() => onSelect(agent.id)}
                      className="flex-1 min-w-0 text-left focus-visible:outline-none"
                    >
                      <div className={`font-medium text-sm truncate transition-colors ${
                        isSelected ? 'text-accent' : 'text-foreground group-hover:text-accent'
                      }`}>
                        {agent.name}
                      </div>
                      {agent.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {agent.description}
                        </div>
                      )}
                    </button>
                    {onSettingsClick && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSettingsClick(agent);
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-background/80 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:opacity-100"
                        title="Agent Settings"
                      >
                        <Settings size={18} className="text-muted-foreground/70 hover:text-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
