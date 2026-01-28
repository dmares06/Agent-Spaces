import type { Workspace } from '../../lib/types';
import { X, FolderPlus, Upload, Folder } from 'lucide-react';

interface WorkspacePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  openWorkspaceIds: string[];
  onSelect: (workspaceId: string) => void;
  onCreate: () => void;
  onImport: () => void;
}

export default function WorkspacePickerModal({
  isOpen,
  onClose,
  workspaces,
  openWorkspaceIds,
  onSelect,
  onCreate,
  onImport,
}: WorkspacePickerModalProps) {
  if (!isOpen) return null;

  // Filter out already open workspaces
  const availableWorkspaces = workspaces.filter(
    (w) => !openWorkspaceIds.includes(w.id) && w.id !== '__default__'
  );

  function handleSelect(workspaceId: string) {
    onSelect(workspaceId);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Open Workspace</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onCreate();
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              <FolderPlus size={16} />
              <span>New Workspace</span>
            </button>
            <button
              onClick={() => {
                onImport();
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Upload size={16} />
              <span>Import Folder</span>
            </button>
          </div>

          {/* Workspace List */}
          {availableWorkspaces.length > 0 ? (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Available Workspaces
              </div>
              {availableWorkspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleSelect(workspace.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted rounded-lg transition-colors"
                >
                  <Folder size={16} className="text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {workspace.name}
                    </div>
                    {workspace.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {workspace.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                No other workspaces available. Create or import one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
