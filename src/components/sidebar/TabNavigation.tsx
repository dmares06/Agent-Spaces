import { MessageSquare, FolderKanban, Bot } from 'lucide-react';

export type SidebarTab = 'chats' | 'workspaces' | 'agents';

interface TabNavigationProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  chatCount?: number;
  workspaceCount?: number;
  agentCount?: number;
  isCollapsed?: boolean;
}

export default function TabNavigation({
  activeTab,
  onTabChange,
  chatCount = 0,
  workspaceCount = 0,
  agentCount = 0,
  isCollapsed,
}: TabNavigationProps) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col border-b border-border/50">
        <button
          onClick={() => onTabChange('chats')}
          className={`p-2 transition-colors flex items-center justify-center relative ${
            activeTab === 'chats'
              ? 'text-accent bg-accent/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title="Chats"
        >
          <MessageSquare size={18} />
          {activeTab === 'chats' && (
            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-accent" />
          )}
        </button>
        <button
          onClick={() => onTabChange('workspaces')}
          className={`p-2 transition-colors flex items-center justify-center relative ${
            activeTab === 'workspaces'
              ? 'text-accent bg-accent/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title="Workspaces"
        >
          <FolderKanban size={18} />
          {activeTab === 'workspaces' && (
            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-accent" />
          )}
        </button>
        <button
          onClick={() => onTabChange('agents')}
          className={`p-2 transition-colors flex items-center justify-center relative ${
            activeTab === 'agents'
              ? 'text-accent bg-accent/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
          title="Agents"
        >
          <Bot size={18} />
          {activeTab === 'agents' && (
            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-accent" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex border-b border-border/50 px-2">
      <button
        onClick={() => onTabChange('chats')}
        className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors relative ${
          activeTab === 'chats'
            ? 'text-accent'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <MessageSquare size={14} />
          <span>Chats</span>
          {chatCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium min-w-[18px] text-center">
              {chatCount}
            </span>
          )}
        </div>
        {activeTab === 'chats' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        )}
      </button>

      <button
        onClick={() => onTabChange('workspaces')}
        className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors relative ${
          activeTab === 'workspaces'
            ? 'text-accent'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <FolderKanban size={14} />
          <span>Workspaces</span>
          {workspaceCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium min-w-[18px] text-center">
              {workspaceCount}
            </span>
          )}
        </div>
        {activeTab === 'workspaces' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        )}
      </button>

      <button
        onClick={() => onTabChange('agents')}
        className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors relative ${
          activeTab === 'agents'
            ? 'text-accent'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <Bot size={14} />
          <span>Agents</span>
          {agentCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium min-w-[18px] text-center">
              {agentCount}
            </span>
          )}
        </div>
        {activeTab === 'agents' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        )}
      </button>
    </div>
  );
}
