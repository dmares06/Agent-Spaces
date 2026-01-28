import { useState } from 'react';
import ContextFiles from './ContextFiles';
import WorkingDirectory from './WorkingDirectory';
import EnhancedFileTree from './EnhancedFileTree';

interface FilesSectionProps {
  chatId?: string;
  workspacePath?: string;
  onFileCountChange?: (count: number) => void;
  onFileOpen?: (path: string, name: string) => void;
  onWorkspacePathChange?: (path: string) => void;
}

export default function FilesSection({ chatId, workspacePath, onFileCountChange, onFileOpen, onWorkspacePathChange }: FilesSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'context' | 'directory'>('directory');

  console.log('[FilesSection] Props:', { chatId, workspacePath });

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveSubTab('context')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeSubTab === 'context'
              ? 'text-accent border-b-2 border-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Context Files
        </button>
        <button
          onClick={() => setActiveSubTab('directory')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeSubTab === 'directory'
              ? 'text-accent border-b-2 border-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Working Directory
        </button>
      </div>

      {/* Content */}
      {activeSubTab === 'context' ? (
        <ContextFiles chatId={chatId} onFileCountChange={onFileCountChange} />
      ) : (
        <div className="h-[calc(100vh-400px)] min-h-[400px]">
          <EnhancedFileTree
            workspacePath={workspacePath}
            onFileOpen={onFileOpen}
            onWorkspacePathChange={onWorkspacePathChange}
          />
        </div>
      )}
    </div>
  );
}
