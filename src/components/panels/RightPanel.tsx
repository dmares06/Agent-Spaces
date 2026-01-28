import { ReactNode } from 'react';
import PanelSection from './PanelSection';
import { CheckSquare, FolderOpen, Shield } from 'lucide-react';

interface RightPanelProps {
  tasksContent?: ReactNode;
  filesContent?: ReactNode;
  rulesContent?: ReactNode;
  taskCount?: number;
  fileCount?: number;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function RightPanel({
  tasksContent,
  filesContent,
  rulesContent,
  taskCount = 0,
  fileCount = 0,
  isCollapsed = false,
  onToggle,
}: RightPanelProps) {
  return (
    <div className="relative flex-shrink-0 flex min-w-[32px]">
      {/* Panel Container */}
      <div className={`${isCollapsed ? 'w-0' : 'w-80'} h-full border-l border-border/50 shadow-xl bg-card overflow-hidden transition-all duration-300`}>
        {/* Panel Content */}
        <div className={`w-80 h-full overflow-y-auto ${isCollapsed ? 'invisible' : 'visible'}`}>
      {/* Tasks Section */}
      <PanelSection
        title="Tasks"
        icon={CheckSquare}
        badge={
          taskCount > 0 ? (
            <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full font-medium">
              {taskCount}
            </span>
          ) : undefined
        }
      >
        {tasksContent || (
          <div className="text-sm text-muted-foreground text-center py-4">
            No tasks yet
          </div>
        )}
      </PanelSection>

      {/* Files Section */}
      <PanelSection
        title="Files"
        icon={FolderOpen}
        badge={
          fileCount > 0 ? (
            <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full font-medium">
              {fileCount}
            </span>
          ) : undefined
        }
      >
        {filesContent || (
          <div className="text-sm text-muted-foreground text-center py-4">
            No files attached
          </div>
        )}
      </PanelSection>

      {/* Rules/Permissions Section */}
      <PanelSection title="Rules & Permissions" icon={Shield}>
        {rulesContent || (
          <div className="text-sm text-muted-foreground text-center py-4">
            No custom rules set
          </div>
        )}
      </PanelSection>
        </div>
      </div>
    </div>
  );
}
