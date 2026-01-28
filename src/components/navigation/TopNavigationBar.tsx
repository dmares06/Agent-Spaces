import {
  Terminal,
  Palette,
  Monitor,
  CheckSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Folder,
  Minus,
  Square,
  X as CloseIcon
} from 'lucide-react';

interface TopNavigationBarProps {
  // Sidebar state
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  onLeftSidebarToggle: () => void;
  onRightSidebarToggle: () => void;

  // Panel toggles
  showTerminal: boolean;
  showPreview: boolean;
  showCanvas: boolean;
  showPersonalTasks: boolean;
  onTerminalToggle: () => void;
  onPreviewToggle: () => void;
  onCanvasToggle: () => void;
  onPersonalTasksToggle: () => void;

  // Workspace info
  workspaceName?: string;

  // Actions
  onSearchClick: () => void;
}

export default function TopNavigationBar({
  leftSidebarCollapsed,
  rightSidebarCollapsed,
  onLeftSidebarToggle,
  onRightSidebarToggle,
  showTerminal,
  showPreview,
  showCanvas,
  showPersonalTasks,
  onTerminalToggle,
  onPreviewToggle,
  onCanvasToggle,
  onPersonalTasksToggle,
  workspaceName,
  onSearchClick,
}: TopNavigationBarProps) {

  const handleMinimize = () => {
    window.electronAPI?.window?.minimize?.();
  };

  const handleMaximize = () => {
    window.electronAPI?.window?.toggleMaximize?.();
  };

  const handleClose = () => {
    window.electronAPI?.window?.close?.();
  };

  return (
    <div className="h-12 bg-background border-b border-border flex items-center select-none">
      {/* Left Section: Window Controls + Left Sidebar Toggle */}
      <div className="flex items-center gap-1 px-3">
        {/* macOS Window Controls */}
        <div className="flex items-center gap-2 mr-3">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center group"
            title="Close"
          >
            <CloseIcon size={8} className="text-red-900 opacity-0 group-hover:opacity-100" />
          </button>
          <button
            onClick={handleMinimize}
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors flex items-center justify-center group"
            title="Minimize"
          >
            <Minus size={8} className="text-yellow-900 opacity-0 group-hover:opacity-100" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center group"
            title="Maximize"
          >
            <Square size={6} className="text-green-900 opacity-0 group-hover:opacity-100" />
          </button>
        </div>

        {/* Left Sidebar Toggle */}
        <button
          onClick={onLeftSidebarToggle}
          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
          title={leftSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        >
          {leftSidebarCollapsed ? (
            <PanelLeftOpen size={16} className="text-blue-500" />
          ) : (
            <PanelLeftClose size={16} className="text-blue-500" />
          )}
        </button>
      </div>

      {/* Center Section: Panel Toggle Buttons */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {/* Terminal Toggle */}
        <button
          onClick={onTerminalToggle}
          className={`p-2 rounded-md border-2 transition-all ${
            showTerminal
              ? 'border-blue-500 text-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-transparent dark:hover:bg-gray-800'
          }`}
          title="Toggle Terminal"
        >
          <Terminal size={16} />
        </button>

        {/* Preview Toggle */}
        <button
          onClick={onPreviewToggle}
          className={`p-2 rounded-md border-2 transition-all ${
            showPreview
              ? 'border-purple-500 text-purple-500 bg-purple-50 dark:bg-purple-950'
              : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-transparent dark:hover:bg-gray-800'
          }`}
          title="Toggle Live Preview"
        >
          <Monitor size={16} />
        </button>

        {/* Canvas Toggle */}
        <button
          onClick={onCanvasToggle}
          className={`p-2 rounded-md border-2 transition-all ${
            showCanvas
              ? 'border-green-500 text-green-500 bg-green-50 dark:bg-green-950'
              : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-transparent dark:hover:bg-gray-800'
          }`}
          title="Toggle Canvas"
        >
          <Palette size={16} />
        </button>

        {/* Personal Tasks Toggle */}
        <button
          onClick={onPersonalTasksToggle}
          className={`p-2 rounded-md border-2 transition-all ${
            showPersonalTasks
              ? 'border-orange-500 text-orange-500 bg-orange-50 dark:bg-orange-950'
              : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-transparent dark:hover:bg-gray-800'
          }`}
          title="Toggle Personal Tasks"
        >
          <CheckSquare size={16} />
        </button>
      </div>

      {/* Right Section: Workspace Info + Search + Right Sidebar Toggle */}
      <div className="flex items-center gap-2 px-3">
        {/* Workspace Name */}
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-muted/50">
          <Folder size={14} className="text-accent flex-shrink-0" />
          <span className="text-[11px] font-medium text-foreground truncate max-w-[150px]">
            {workspaceName || 'No Workspace'}
          </span>
        </div>

        {/* Search Files */}
        <button
          onClick={onSearchClick}
          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
          title="Search files (Cmd+P)"
        >
          <Search size={16} className="text-blue-500" />
        </button>

        {/* Right Sidebar Toggle */}
        <button
          onClick={onRightSidebarToggle}
          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors"
          title={rightSidebarCollapsed ? 'Show panel' : 'Hide panel'}
        >
          {rightSidebarCollapsed ? (
            <PanelRightOpen size={16} className="text-blue-500" />
          ) : (
            <PanelRightClose size={16} className="text-blue-500" />
          )}
        </button>
      </div>
    </div>
  );
}
