import { useState, useEffect } from 'react';
import type { OpenFile } from '../../lib/types';
import FileEditor from './FileEditor';
import FileEditorChat from './FileEditorChat';
import ResizableDivider from './ResizableDivider';
import FileTree from './FileTree';
import FileTabs from './FileTabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EditorLayoutProps {
  files: OpenFile[];
  activeFilePath: string;
  workspaceId?: string;
  onFileChange: (content: string) => void;
  onFileSave: () => Promise<void>;
  onFileClose: (filePath?: string) => void;
  onFileSelect: (filePath: string) => void;
}

const STORAGE_KEY = 'editor-split-ratio';
const SIDEBAR_WIDTH_KEY = 'editor-sidebar-width';
const SIDEBAR_VISIBLE_KEY = 'editor-sidebar-visible';
const DEFAULT_RATIO = 0.6;
const DEFAULT_SIDEBAR_WIDTH = 250;

export default function EditorLayout({
  files,
  activeFilePath,
  workspaceId,
  onFileChange,
  onFileSave,
  onFileClose,
  onFileSelect,
}: EditorLayoutProps) {
  const activeFile = files.find((f) => f.path === activeFilePath);

  if (!activeFile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No file selected</p>
      </div>
    );
  }
  const [splitRatio, setSplitRatio] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseFloat(saved) : DEFAULT_RATIO;
  });
  const [saving, setSaving] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_VISIBLE_KEY);
    return saved ? saved === 'true' : true;
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved) : DEFAULT_SIDEBAR_WIDTH;
  });

  // Persist split ratio
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, splitRatio.toString());
  }, [splitRatio]);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_VISIBLE_KEY, sidebarVisible.toString());
  }, [sidebarVisible]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  async function handleSave() {
    setSaving(true);
    try {
      await onFileSave();
    } finally {
      setSaving(false);
    }
  }

  function handleApplyEdit(newContent: string) {
    onFileChange(newContent);
  }

  // Extract root path from file path (go up until we find a project root)
  const getRootPath = () => {
    const pathParts = activeFile.path.split('/');
    // Try to find common project indicators
    const projectIndicators = ['src', 'node_modules', 'package.json', '.git'];

    // For now, use a simple heuristic: go up 2-3 levels from the file
    const rootDepth = Math.max(pathParts.length - 4, 1);
    return pathParts.slice(0, rootDepth).join('/') || '/';
  };

  return (
    <div id="editor-layout-container" className="flex h-full">
      {/* File Tree Sidebar */}
      {sidebarVisible && (
        <div
          className="border-r border-border flex-shrink-0 overflow-hidden"
          style={{ width: sidebarWidth }}
        >
          <FileTree
            rootPath={getRootPath()}
            onFileSelect={(filePath) => {
              // TODO: In the future, this will open the file in a new tab
              console.log('[EditorLayout] File selected:', filePath);
            }}
            selectedFilePath={activeFile.path}
          />
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarVisible(!sidebarVisible)}
          className="absolute top-2 left-2 z-10 p-1.5 bg-secondary hover:bg-secondary/80 rounded transition-colors"
          title={sidebarVisible ? 'Hide File Tree' : 'Show File Tree'}
        >
          {sidebarVisible ? (
            <ChevronLeft size={16} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={16} className="text-muted-foreground" />
          )}
        </button>

        {/* File Tabs */}
        <FileTabs
          openFiles={files}
          activeFilePath={activeFilePath}
          onSelectFile={onFileSelect}
          onCloseFile={onFileClose}
        />

        {/* Editor Section */}
        <div style={{ height: `${splitRatio * 100}%` }} className="flex-shrink-0">
          <FileEditor
            file={activeFile}
            onChange={onFileChange}
            onSave={handleSave}
            onClose={() => onFileClose(activeFilePath)}
            saving={saving}
          />
        </div>

        {/* Resizable Divider */}
        <ResizableDivider
          onResize={setSplitRatio}
          minRatio={0.3}
          maxRatio={0.8}
        />

        {/* Chat Section */}
        <div style={{ height: `${(1 - splitRatio) * 100}%` }} className="flex-shrink-0 min-h-0">
          <FileEditorChat
            file={activeFile}
            workspaceId={workspaceId}
            onApplyEdit={handleApplyEdit}
          />
        </div>
      </div>
    </div>
  );
}
