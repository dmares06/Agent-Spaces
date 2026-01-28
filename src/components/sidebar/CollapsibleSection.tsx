import { useState, useRef, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
  actions?: ReactNode;
  isCollapsed?: boolean; // Sidebar collapsed state
  droppable?: boolean;
  dropTargetId?: string | null; // null for global, string for workspace
  onDrop?: (agentId: string, targetId: string | null) => void;
}

export default function CollapsibleSection({
  title,
  count,
  icon,
  defaultExpanded = true,
  children,
  actions,
  isCollapsed = false,
  droppable = false,
  dropTargetId,
  onDrop,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  function handleDragEnter(e: React.DragEvent) {
    if (!droppable) return;
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('application/agent-id')) {
      setIsDragOver(true);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    if (!droppable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!droppable) return;
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    if (!droppable || !onDrop) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);

    const agentId = e.dataTransfer.getData('application/agent-id');
    console.log('[CollapsibleSection] Drop received, agentId:', agentId, 'targetId:', dropTargetId);
    if (agentId) {
      onDrop(agentId, dropTargetId ?? null);
    }
  }

  return (
    <div
      className={`border-b border-border/30 transition-colors ${
        isDragOver ? 'bg-accent/10 border-accent' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header - using div with role="button" to avoid nesting buttons */}
      <div
        className={`w-full flex items-center transition-colors ${
          isCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2'
        } hover:bg-background/50 rounded-lg`}
      >
        {/* Clickable expand/collapse area */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center transition-colors ${
            isCollapsed
              ? 'justify-center w-full h-9 rounded-lg hover:bg-accent hover:text-white'
              : 'gap-2 min-w-0 flex-1 text-left'
          }`}
          type="button"
          title={isCollapsed ? title : undefined}
        >
          {isCollapsed ? (
            // Icon-only mode - show just the icon as a button
            <div className="flex items-center justify-center">{icon}</div>
          ) : (
            <>
              <ChevronRight
                size={16}
                className={`text-muted-foreground/60 flex-shrink-0 transition-transform duration-200 ${
                  expanded ? 'rotate-90' : ''
                }`}
              />
              {icon && <span className="flex-shrink-0">{icon}</span>}
              <span className="text-xs font-semibold text-foreground truncate">
                {title}
              </span>
              {count !== undefined && (
                <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded-full ml-auto flex-shrink-0">
                  {count}
                </span>
              )}
            </>
          )}
        </button>
        {/* Actions area - separate from expand/collapse button */}
        {!isCollapsed && actions && (
          <div className="flex items-center gap-1 ml-1 flex-shrink-0">{actions}</div>
        )}
      </div>

      {/* Content */}
      {expanded && (
        <div className="px-3 pb-3">{children}</div>
      )}
    </div>
  );
}
