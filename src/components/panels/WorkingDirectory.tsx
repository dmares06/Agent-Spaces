import { useState, useEffect } from 'react';
import { electronAPI } from '../../lib/electronAPI';
import { type FileInfo } from '../../lib/types';
import FileItem from './FileItem';
import { FolderOpen, ChevronLeft } from 'lucide-react';

interface WorkingDirectoryProps {
  workspacePath?: string;
  onFileOpen?: (path: string, name: string) => void;
}

export default function WorkingDirectory({ workspacePath, onFileOpen }: WorkingDirectoryProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[WorkingDirectory] workspacePath changed:', workspacePath);
    if (workspacePath) {
      setCurrentPath(workspacePath);
    }
  }, [workspacePath]);

  useEffect(() => {
    if (currentPath) {
      loadDirectory(currentPath);
    }
  }, [currentPath]);

  async function loadDirectory(path: string) {
    try {
      console.log('[WorkingDirectory] Loading directory:', path);
      setLoading(true);
      const data = await electronAPI.files.listDirectory(path);
      console.log('[WorkingDirectory] Files loaded:', data.length, 'items');
      setFiles(data);
    } catch (error) {
      console.error('[WorkingDirectory] Failed to load directory:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleBrowse() {
    try {
      const path = await electronAPI.files.browseDirectory();
      if (path) {
        setCurrentPath(path);
      }
    } catch (error) {
      console.error('Failed to browse directory:', error);
    }
  }

  function handleFileClick(file: FileInfo) {
    if (file.isDirectory) {
      setCurrentPath(file.path);
    }
  }

  function handleFileDoubleClick(file: FileInfo) {
    if (!file.isDirectory && onFileOpen) {
      onFileOpen(file.path, file.name);
    }
  }

  function handleGoUp() {
    if (!currentPath) return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    if (parentPath) {
      setCurrentPath(parentPath);
    }
  }

  if (!workspacePath && !currentPath) {
    return (
      <div className="space-y-2">
        <button
          onClick={handleBrowse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors"
        >
          <FolderOpen size={14} />
          <span>Browse Directory</span>
        </button>
        <div className="text-sm text-muted-foreground text-center py-4">
          No working directory set
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Loading directory...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Path Navigation */}
      <div className="flex items-center gap-2">
        {currentPath && currentPath !== '/' && (
          <button
            onClick={handleGoUp}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Go up"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <button
          onClick={handleBrowse}
          className="flex-1 px-2 py-1 text-xs text-left bg-muted rounded truncate hover:bg-muted/80 transition-colors"
          title={currentPath || ''}
        >
          {currentPath ? currentPath.split('/').slice(-2).join('/') : 'Select folder'}
        </button>
      </div>

      {/* File List */}
      {files.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          Empty directory
        </div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {files.map((file) => (
            <FileItem
              key={file.path}
              file={file}
              onClick={file.isDirectory ? () => handleFileClick(file) : undefined}
              onDoubleClick={!file.isDirectory ? () => handleFileDoubleClick(file) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
