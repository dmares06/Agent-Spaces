import { useState } from 'react';
import type { Workspace } from '../../lib/types';
import { X, Plus, Trash2 } from 'lucide-react';

interface WorkspaceTabsProps {
  workspaces: Workspace[];
  openWorkspaceIds: string[];
  activeWorkspaceId: string | null;
  onSelect: (workspaceId: string) => void;
  onClose: (workspaceId: string) => void;
  onAdd: () => void;
  onDelete: (workspaceId: string) => void;
  isCollapsed?: boolean;
}

export default function WorkspaceTabs({
  workspaces,
  openWorkspaceIds,
  activeWorkspaceId,
  onSelect,
  onClose,
  onAdd,
  onDelete,
  isCollapsed = false,
}: WorkspaceTabsProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workspaceId: string } | null>(null);

  // Get open workspaces in order
  const openWorkspaces = openWorkspaceIds
    .map(id => workspaces.find(w => w.id === id))
    .filter((w): w is Workspace => w !== undefined);

  function handleContextMenu(e: React.MouseEvent, workspaceId: string) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, workspaceId });
  }

  function handleCloseContextMenu() {
    setContextMenu(null);
  }

  function handleDeleteWorkspace() {
    if (contextMenu) {
      onDelete(contextMenu.workspaceId);
      setContextMenu(null);
    }
  }

  if (isCollapsed) {
    return (
      <div className="p-4 shadow-sm bg-background/50">
        <button
          onClick={onAdd}
          className="w-full p-2 hover:bg-background/80 rounded-lg transition-colors flex items-center justify-center"
          title="Open Workspace"
        >
          <Plus size={18} className="text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center shadow-sm bg-background/50 p-4 overflow-x-auto">
        {/* macOS traffic light spacer - draggable region */}
        <div
          className="w-[70px] h-full flex-shrink-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        {/* Workspace Tabs */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-thin">
          {openWorkspaces.map((workspace) => {
            const isActive = workspace.id === activeWorkspaceId;
            return (
              <div
                key={workspace.id}
                className={`group flex items-center gap-2 px-4 py-3 min-w-[120px] cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'bg-card text-foreground shadow-sm rounded-lg'
                    : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-lg'
                }`}
                onClick={() => onSelect(workspace.id)}
                onContextMenu={(e) => handleContextMenu(e, workspace.id)}
              >
                <span className="text-sm font-medium truncate flex-1" title={workspace.name}>
                  {workspace.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(workspace.id);
                  }}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10 rounded transition-all"
                  title="Close tab"
                >
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Button */}
        <button
          onClick={onAdd}
          className="p-2 hover:bg-background/80 rounded-lg transition-colors flex-shrink-0"
          title="Open Workspace"
        >
          <Plus size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={handleCloseContextMenu}
          />
          <div
            className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[150px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleDeleteWorkspace}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={14} />
              <span>Delete Workspace</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
