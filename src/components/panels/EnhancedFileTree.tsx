import { useState, useEffect } from 'react';
import { electronAPI, FileNode } from '../../lib/electronAPI';
import {
  ChevronRight,
  ChevronDown,
  Search,
  GitBranch,
  Copy,
  MoreVertical,
  File,
  Folder,
  FolderOpen,
  FileJson,
  FileCode2,
  FileText,
  Settings,
  Image,
  Database,
  FolderPlus,
  RefreshCw,
  ChevronsRight,
  ChevronsDown,
} from 'lucide-react';

interface EnhancedFileTreeProps {
  workspacePath?: string;
  onFileOpen?: (path: string, name: string) => void;
  selectedFilePath?: string;
  onWorkspacePathChange?: (path: string) => void;
}

export default function EnhancedFileTree({
  workspacePath,
  onFileOpen,
  selectedFilePath,
  onWorkspacePathChange,
}: EnhancedFileTreeProps) {
  const [currentWorkspacePath, setCurrentWorkspacePath] = useState<string | undefined>(workspacePath);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gitBranch, setGitBranch] = useState<string | null>(null);

  useEffect(() => {
    setCurrentWorkspacePath(workspacePath);
  }, [workspacePath]);

  useEffect(() => {
    if (currentWorkspacePath) {
      loadFileTree();
      loadGitBranch();
    }
  }, [currentWorkspacePath]);

  async function loadFileTree() {
    if (!currentWorkspacePath) {
      console.log('[EnhancedFileTree] No workspace path provided');
      return;
    }
    try {
      console.log('[EnhancedFileTree] Loading file tree for:', currentWorkspacePath);
      setLoading(true);
      const tree = await electronAPI.files.getFileTree(currentWorkspacePath);
      setFileTree(tree);
      console.log('[EnhancedFileTree] Received tree:', tree);

      // Auto-expand root and first level directories
      const pathsToExpand = new Set<string>();
      pathsToExpand.add(tree.path); // Root

      // Also expand first level directories (like src, components, etc.)
      if (tree.children) {
        tree.children.forEach(child => {
          if (child.type === 'directory') {
            pathsToExpand.add(child.path);
          }
        });
      }

      setExpandedDirs(pathsToExpand);
      console.log('[EnhancedFileTree] Loaded tree with', tree.children?.length || 0, 'items');
      console.log('[EnhancedFileTree] Auto-expanded paths:', Array.from(pathsToExpand));
    } catch (error) {
      console.error('[EnhancedFileTree] Failed to load file tree:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadGitBranch() {
    if (!currentWorkspacePath) return;
    try {
      // Execute git command to get current branch
      // Note: This requires adding a git IPC handler
      // For now, we'll show a placeholder
      setGitBranch('main');
    } catch (error) {
      console.error('[EnhancedFileTree] Failed to load git branch:', error);
    }
  }

  async function handleBrowseFolder() {
    try {
      const selectedPath = await electronAPI.system.selectFolder();
      if (selectedPath) {
        setCurrentWorkspacePath(selectedPath);
        // Notify parent component if callback provided
        if (onWorkspacePathChange) {
          onWorkspacePathChange(selectedPath);
        }
      }
    } catch (error) {
      console.error('[EnhancedFileTree] Failed to browse folder:', error);
    }
  }

  function toggleDirectory(dirPath: string) {
    setExpandedDirs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dirPath)) {
        newSet.delete(dirPath);
      } else {
        newSet.add(dirPath);
      }
      return newSet;
    });
  }

  function expandAll() {
    if (!fileTree) return;
    const allDirs = new Set<string>();

    function collectDirs(node: FileNode) {
      if (node.type === 'directory') {
        allDirs.add(node.path);
        if (node.children) {
          node.children.forEach(child => collectDirs(child));
        }
      }
    }

    collectDirs(fileTree);
    setExpandedDirs(allDirs);
  }

  function collapseAll() {
    // Keep only the root expanded
    if (fileTree) {
      setExpandedDirs(new Set([fileTree.path]));
    }
  }

  function getFileIcon(fileName: string, isDirectory: boolean, isExpanded: boolean) {
    if (isDirectory) {
      return isExpanded ? (
        <FolderOpen size={14} className="text-accent flex-shrink-0" />
      ) : (
        <Folder size={14} className="text-accent flex-shrink-0" />
      );
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // File type icons
    const iconMap: Record<string, JSX.Element> = {
      // JSON
      json: <FileJson size={14} className="text-yellow-500 flex-shrink-0" />,
      // TypeScript/JavaScript
      ts: <FileCode2 size={14} className="text-blue-500 flex-shrink-0" />,
      tsx: <FileCode2 size={14} className="text-blue-400 flex-shrink-0" />,
      js: <FileCode2 size={14} className="text-yellow-400 flex-shrink-0" />,
      jsx: <FileCode2 size={14} className="text-yellow-300 flex-shrink-0" />,
      // Markdown
      md: <FileText size={14} className="text-blue-300 flex-shrink-0" />,
      // Images
      png: <Image size={14} className="text-purple-400 flex-shrink-0" />,
      jpg: <Image size={14} className="text-purple-400 flex-shrink-0" />,
      jpeg: <Image size={14} className="text-purple-400 flex-shrink-0" />,
      svg: <Image size={14} className="text-purple-300 flex-shrink-0" />,
      // Config
      env: <Settings size={14} className="text-gray-400 flex-shrink-0" />,
      config: <Settings size={14} className="text-gray-400 flex-shrink-0" />,
      // Database
      sql: <Database size={14} className="text-orange-400 flex-shrink-0" />,
      db: <Database size={14} className="text-orange-400 flex-shrink-0" />,
    };

    return iconMap[ext] || <File size={14} className="text-muted-foreground flex-shrink-0" />;
  }

  function renderNode(node: FileNode, depth: number = 0): JSX.Element | null {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFilePath === node.path;
    const paddingLeft = depth * 16 + 8;

    // Search filter
    if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      // Check if any children match
      if (node.type === 'directory' && node.children) {
        const hasMatchingChildren = node.children.some((child) =>
          child.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (!hasMatchingChildren) return null;
      } else {
        return null;
      }
    }

    if (node.type === 'directory') {
      return (
        <div key={node.path}>
          {/* Directory header */}
          <div
            className={`flex items-center gap-1 py-1 px-1 cursor-pointer hover:bg-accent/10 transition-colors rounded-sm ${
              isSelected ? 'bg-accent/10' : ''
            }`}
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={() => toggleDirectory(node.path)}
          >
            {isExpanded ? (
              <ChevronDown size={12} className="text-muted-foreground/70 flex-shrink-0" />
            ) : (
              <ChevronRight size={12} className="text-muted-foreground/70 flex-shrink-0" />
            )}
            {getFileIcon(node.name, true, isExpanded)}
            <span className="text-[11px] text-foreground truncate font-medium">{node.name}</span>
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
        className={`flex items-center gap-1 py-1 px-1 cursor-pointer hover:bg-accent/10 transition-colors rounded-sm ${
          isSelected ? 'bg-accent/20' : ''
        }`}
        style={{ paddingLeft: `${paddingLeft + 12}px` }}
        onClick={() => onFileOpen?.(node.path, node.name)}
      >
        {getFileIcon(node.name, false, false)}
        <span className="text-[11px] text-foreground/90 truncate">{node.name}</span>
      </div>
    );
  }

  if (!currentWorkspacePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
        <Folder size={32} className="text-muted-foreground/40" />
        <div className="text-center">
          <p className="text-xs font-medium text-foreground mb-1">No Folder Selected</p>
          <p className="text-[10px] text-muted-foreground">Browse for a folder to view files</p>
        </div>
        <button
          onClick={handleBrowseFolder}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors"
        >
          <FolderPlus size={14} />
          Browse Folder
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-xs text-muted-foreground">Loading files...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-border">
        <button
          className="p-1.5 hover:bg-secondary rounded transition-colors"
          title="Browse folder"
          onClick={handleBrowseFolder}
        >
          <FolderPlus size={14} className="text-accent" />
        </button>
        <button
          className="p-1.5 hover:bg-secondary rounded transition-colors"
          title="Refresh"
          onClick={loadFileTree}
        >
          <RefreshCw size={14} className="text-muted-foreground" />
        </button>
        <div className="w-px h-4 bg-border" />
        <button
          className="p-1.5 hover:bg-secondary rounded transition-colors"
          title="Expand all"
          onClick={expandAll}
        >
          <ChevronsDown size={14} className="text-muted-foreground" />
        </button>
        <button
          className="p-1.5 hover:bg-secondary rounded transition-colors"
          title="Collapse all"
          onClick={collapseAll}
        >
          <ChevronsRight size={14} className="text-muted-foreground" />
        </button>
        <div className="w-px h-4 bg-border" />
        <button
          className="p-1.5 hover:bg-secondary rounded transition-colors"
          title="Search files"
          onClick={() => {
            const input = document.getElementById('file-search');
            input?.focus();
          }}
        >
          <Search size={14} className="text-muted-foreground" />
        </button>
        {gitBranch && (
          <>
            <div className="w-px h-4 bg-border" />
            <button
              className="p-1.5 hover:bg-secondary rounded transition-colors flex items-center gap-1"
              title={`Current branch: ${gitBranch}`}
            >
              <GitBranch size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate max-w-[50px]">{gitBranch}</span>
            </button>
          </>
        )}
      </div>

      {/* Current Path Display */}
      <div className="px-2 py-1 border-b border-border bg-muted/30">
        <p className="text-[10px] text-muted-foreground truncate" title={currentWorkspacePath}>
          {currentWorkspacePath ? currentWorkspacePath.split('/').slice(-2).join('/') || currentWorkspacePath : 'No folder'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-2 py-1.5 border-b border-border">
        <input
          id="file-search"
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1 text-xs bg-secondary border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 py-2">
        {fileTree ? (
          fileTree.children && fileTree.children.length > 0 ? (
            // Render all children of root (we don't need to render root itself)
            <div className="space-y-0.5">
              {fileTree.children
                .sort((a, b) => {
                  if (a.type === b.type) return a.name.localeCompare(b.name);
                  return a.type === 'directory' ? -1 : 1;
                })
                .map((child) => renderNode(child, 0))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Folder size={24} className="text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Empty directory</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Folder size={24} className="text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No files loaded</p>
          </div>
        )}
      </div>
    </div>
  );
}
