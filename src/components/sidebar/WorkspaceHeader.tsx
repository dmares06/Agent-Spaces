import { Folder, ChevronDown } from 'lucide-react';
import type { Workspace } from '../../lib/types';

interface WorkspaceHeaderProps {
  workspace: Workspace | null;
  isCollapsed?: boolean;
}

export default function WorkspaceHeader({ workspace, isCollapsed }: WorkspaceHeaderProps) {
  if (isCollapsed) {
    return (
      <div className="p-2 border-b border-border/50">
        <div className="w-full p-2 rounded-lg bg-accent/10 flex items-center justify-center">
          <Folder size={18} className="text-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border-b border-border/50">
      <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors group">
        {/* Workspace Icon */}
        <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Folder size={14} className="text-accent" />
        </div>

        {/* Workspace Name */}
        <div className="flex-1 text-left min-w-0">
          <div className="text-xs font-medium text-foreground truncate">
            {workspace?.name || 'No Workspace'}
          </div>
          {workspace?.folder_path && (
            <div className="text-[10px] text-muted-foreground truncate">
              {workspace.folder_path.split('/').pop()}
            </div>
          )}
        </div>

        {/* Dropdown Arrow */}
        <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
      </button>
    </div>
  );
}
