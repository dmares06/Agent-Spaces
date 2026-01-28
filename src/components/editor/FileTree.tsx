import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileTreeProps {
  rootPath: string;
  onFileSelect: (filePath: string) => void;
  selectedFilePath?: string;
}

export default function FileTree({ rootPath, onFileSelect, selectedFilePath }: FileTreeProps) {
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFileTree();
  }, [rootPath]);

  const loadFileTree = async () => {
    try {
      setLoading(true);
      const tree = await window.electronAPI.files.getFileTree(rootPath);
      setFileTree(tree);
      // Auto-expand root
      setExpandedDirs(new Set([rootPath]));
    } catch (error) {
      console.error('[FileTree] Failed to load file tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDirectory = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dirPath)) {
        newSet.delete(dirPath);
      } else {
        newSet.add(dirPath);
      }
      return newSet;
    });
  };

  const renderNode = (node: FileNode, depth: number = 0): JSX.Element => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFilePath === node.path;
    const paddingLeft = depth * 16 + 8;

    if (node.type === 'directory') {
      return (
        <div key={node.path}>
          {/* Directory header */}
          <div
            className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-secondary/50 transition-colors ${
              isSelected ? 'bg-secondary' : ''
            }`}
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={() => toggleDirectory(node.path)}
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen size={16} className="text-accent flex-shrink-0" />
            ) : (
              <Folder size={16} className="text-accent flex-shrink-0" />
            )}
            <span className="text-sm text-foreground truncate">{node.name}</span>
          </div>

          {/* Children */}
          {isExpanded && node.children && (
            <div>
              {node.children
                .sort((a, b) => {
                  // Directories first, then files
                  if (a.type === b.type) return a.name.localeCompare(b.name);
                  return a.type === 'directory' ? -1 : 1;
                })
                .map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File node
    return (
      <div
        key={node.path}
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-secondary/50 transition-colors ${
          isSelected ? 'bg-secondary' : ''
        }`}
        style={{ paddingLeft: `${paddingLeft + 16}px` }}
        onClick={() => onFileSelect(node.path)}
      >
        <File size={16} className="text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-foreground truncate">{node.name}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-muted-foreground">Loading files...</p>
      </div>
    );
  }

  if (!fileTree) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-sm text-muted-foreground">No files found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Files
        </span>
        <button
          onClick={loadFileTree}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto">
        {renderNode(fileTree)}
      </div>
    </div>
  );
}
