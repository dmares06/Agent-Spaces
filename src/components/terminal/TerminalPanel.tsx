import { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  Terminal as TerminalIcon,
  GripHorizontal,
  Plus,
  ChevronDown,
  Sparkles,
  Bot,
  Code,
  MessageSquare,
  Cpu,
} from 'lucide-react';
import TerminalTab from './TerminalTab';

interface TerminalPanelProps {
  workspacePath: string | undefined;
  onClose: () => void;
  height: number;
  onHeightChange: (height: number) => void;
}

interface Tab {
  id: string;
  name: string;
  type: 'shell' | 'claude' | 'gemini' | 'codex' | 'aider' | 'droid' | 'custom';
  initialCommand?: string;
  icon: React.ReactNode;
}

const CLI_OPTIONS = [
  {
    type: 'shell' as const,
    name: 'Shell',
    icon: <TerminalIcon size={14} />,
    command: undefined,
    description: 'Default shell',
  },
  {
    type: 'claude' as const,
    name: 'Claude',
    icon: <Sparkles size={14} className="text-orange-400" />,
    command: 'claude',
    description: 'Claude Code CLI',
  },
  {
    type: 'gemini' as const,
    name: 'Gemini',
    icon: <Bot size={14} className="text-blue-400" />,
    command: 'gemini',
    description: 'Google Gemini CLI',
  },
  {
    type: 'codex' as const,
    name: 'Codex',
    icon: <Code size={14} className="text-green-400" />,
    command: 'codex',
    description: 'OpenAI Codex CLI',
  },
  {
    type: 'aider' as const,
    name: 'Aider',
    icon: <MessageSquare size={14} className="text-purple-400" />,
    command: 'aider',
    description: 'Aider AI pair programming',
  },
  {
    type: 'droid' as const,
    name: 'Droid Factory',
    icon: <Cpu size={14} className="text-cyan-400" />,
    command: 'droid',
    description: 'Droid Factory CLI',
  },
  {
    type: 'custom' as const,
    name: 'Custom...',
    icon: <Cpu size={14} className="text-gray-400" />,
    command: undefined,
    description: 'Run custom command',
  },
];

export default function TerminalPanel({
  workspacePath,
  onClose,
  height,
  onHeightChange,
}: TerminalPanelProps) {
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: `tab-${Date.now()}`,
      name: 'Shell',
      type: 'shell',
      icon: <TerminalIcon size={12} />,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id || '');
  const [isDragging, setIsDragging] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update activeTabId when tabs change
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const createTab = useCallback((type: Tab['type'], customCommand?: string) => {
    const option = CLI_OPTIONS.find((o) => o.type === type);
    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      name: type === 'custom' ? 'Custom' : option?.name || 'Shell',
      type,
      initialCommand: type === 'custom' ? customCommand : option?.command,
      icon: option?.icon || <TerminalIcon size={12} />,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setShowDropdown(false);
  }, []);

  const closeTab = useCallback((tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);
      if (newTabs.length === 0) {
        onClose();
        return prev;
      }
      return newTabs;
    });
  }, [onClose]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = height;
  }, [height]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = dragStartY.current - e.clientY;
      const newHeight = Math.max(150, Math.min(600, dragStartHeight.current + deltaY));
      onHeightChange(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onHeightChange]);

  const handleCustomCommand = useCallback(() => {
    const command = window.prompt('Enter command to run:', '');
    if (command) {
      createTab('custom', command);
    }
  }, [createTab]);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`h-1.5 cursor-ns-resize flex items-center justify-center hover:bg-accent transition-colors duration-150 ${
          isDragging ? 'bg-accent' : 'bg-border/50'
        }`}
      >
        <GripHorizontal size={16} className={`${isDragging ? 'text-white' : 'text-muted-foreground/50'} transition-colors duration-150`} />
      </div>

      {/* Tab Bar */}
      <div className="flex items-center bg-[#262626] border-b border-[#404040]">
        {/* Tabs */}
        <div className="flex-1 flex items-center overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-r border-[#404040] min-w-0 ${
                activeTabId === tab.id
                  ? 'bg-[#1a1a1a] text-white'
                  : 'bg-[#2a2a2a] text-[#888] hover:bg-[#333] hover:text-white'
              }`}
            >
              <span className="flex-shrink-0">{tab.icon}</span>
              <span className="text-xs font-medium truncate max-w-[80px]">{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="flex-shrink-0 p-0.5 rounded hover:bg-[#555] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Tab Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1 px-2 py-1.5 text-[#888] hover:text-white hover:bg-[#333] transition-colors"
            title="New terminal"
          >
            <Plus size={14} />
            <ChevronDown size={12} />
          </button>

          {showDropdown && (
            <div className="absolute right-0 bottom-full mb-1 bg-[#2a2a2a] border border-[#404040] rounded-lg shadow-xl z-50 min-w-[180px] py-1">
              <div className="px-2 py-1 text-[10px] text-[#666] uppercase tracking-wider">
                Launch Terminal
              </div>
              {CLI_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  onClick={() =>
                    option.type === 'custom' ? handleCustomCommand() : createTab(option.type)
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-[#ccc] hover:bg-[#404040] hover:text-white transition-colors"
                >
                  {option.icon}
                  <div className="flex-1">
                    <div className="font-medium">{option.name}</div>
                    <div className="text-[10px] text-[#666]">{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Close All */}
        <button
          onClick={onClose}
          className="px-2 py-1.5 text-[#888] hover:text-white hover:bg-[#333] transition-colors border-l border-[#404040]"
          title="Close terminal panel (Ctrl+`)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Terminal Tabs Content */}
      <div className="flex-1 overflow-hidden relative">
        {tabs.map((tab) => (
          <TerminalTab
            key={tab.id}
            tabId={tab.id}
            workspacePath={workspacePath}
            isActive={activeTabId === tab.id}
            initialCommand={tab.initialCommand}
          />
        ))}
      </div>
    </div>
  );
}
