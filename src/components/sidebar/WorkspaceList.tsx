import { Folder, FolderOpen, X } from 'lucide-react';
import type { Workspace } from '../../lib/types';

interface WorkspaceListProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelect: (id: string) => void;
  isCollapsed?: boolean;
}

export default function WorkspaceList({
  workspaces,
  activeWorkspaceId,
  onSelect,
  isCollapsed,
}: WorkspaceListProps) {
  if (workspaces.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-xs py-6">
        {isCollapsed ? '' : 'No workspaces yet'}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {workspaces.map((workspace) => {
        const isActive = workspace.id === activeWorkspaceId;

        if (isCollapsed) {
          return (
            <button
              key={workspace.id}
              onClick={() => onSelect(workspace.id)}
              className={`w-full p-2 rounded transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
              title={workspace.name}
            >
              {isActive ? (
                <FolderOpen size={18} className="mx-auto" />
              ) : (
                <Folder size={18} className="mx-auto" />
              )}
            </button>
          );
        }

        return (
          <div
            key={workspace.id}
            className={`group relative rounded-lg transition-colors ${
              isActive ? 'bg-accent/10' : 'hover:bg-muted'
            }`}
          >
            <button
              onClick={() => onSelect(workspace.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left"
            >
              {isActive ? (
                <FolderOpen size={16} className="text-accent flex-shrink-0" />
              ) : (
                <Folder size={16} className="text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${
                  isActive ? 'text-accent' : 'text-foreground'
                }`}>
                  {workspace.name}
                </p>
                {workspace.folder_path && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {workspace.folder_path.split('/').pop()}
                  </p>
                )}
              </div>
            </button>

            {/* Close button - only show when active */}
            {isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(workspace.id); // Toggle/close workspace
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
                title="Close workspace"
              >
                <X size={12} className="text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
