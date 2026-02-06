import type { Workspace, Agent, Chat } from '../../lib/types';
import { MessageSquare, FolderOpen, Bot, Globe, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import WorkspaceHeader from './WorkspaceHeader';
import ActionBar from './ActionBar';
import UserProfile from './UserProfile';
import ChatList from './ChatList';
import AgentList from './AgentList';
import WorkspaceList from './WorkspaceList';

interface SidebarContentProps {
  // Workspace state
  allWorkspaces: Workspace[];
  openWorkspaceIds: string[];
  activeWorkspaceId: string | null;
  onWorkspaceSelect: (id: string) => void;
  onWorkspaceClose: (id: string) => void;
  onWorkspaceDelete: (id: string) => void;
  onWorkspaceAdd: () => void;

  // Chat state
  chats: Chat[];
  globalChats?: Chat[];
  selectedChatId?: string;
  onChatSelect: (id: string) => void;
  onChatsUpdated: () => void;
  onNewChat: () => void;

  // Agent state
  globalAgents: Agent[];
  workspaceAgents: Agent[];
  selectedAgentId?: string;
  onAgentSelect: (id: string) => void;
  onAgentSettings: (agent: Agent) => void;
  onCreateGlobalAgent: () => void;
  onCreateWorkspaceAgent: () => void;
  onAgentDrop?: (agentId: string, targetWorkspaceId: string | null) => void;
  onTaskDrop?: (taskId: string, agentId: string) => void;

  // Settings
  hasApiKey: boolean;
  onSettingsClick: () => void;

  // UI state
  isCollapsed: boolean;
}

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  isCollapsed: boolean;
}

function SectionHeader({ title, icon, count, isExpanded, onToggle, onAdd, isCollapsed }: SectionHeaderProps) {
  if (isCollapsed) {
    return (
      <button
        onClick={onToggle}
        className="w-full p-2 flex justify-center hover:bg-muted/50 rounded-lg transition-colors"
        title={title}
      >
        {icon}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 flex-1 text-left"
      >
        {isExpanded ? (
          <ChevronDown size={16} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={16} className="text-muted-foreground" />
        )}
        {icon}
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {count}
        </span>
      </button>
      {onAdd && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className="p-1 hover:bg-background rounded transition-colors"
          title={`Add ${title.toLowerCase()}`}
        >
          <Plus size={14} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

export default function SidebarContent({
  allWorkspaces,
  openWorkspaceIds,
  activeWorkspaceId,
  onWorkspaceSelect,
  onWorkspaceClose,
  onWorkspaceDelete: _onWorkspaceDelete,
  onWorkspaceAdd,
  chats,
  globalChats = [],
  selectedChatId,
  onChatSelect,
  onChatsUpdated,
  onNewChat,
  globalAgents,
  workspaceAgents,
  selectedAgentId,
  onAgentSelect,
  onAgentSettings,
  onCreateGlobalAgent,
  onCreateWorkspaceAgent,
  onAgentDrop,
  onTaskDrop,
  hasApiKey: _hasApiKey,
  onSettingsClick,
  isCollapsed,
}: SidebarContentProps) {
  // Section expansion state
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [workspacesExpanded, setWorkspacesExpanded] = useState(true);
  const [agentsExpanded, setAgentsExpanded] = useState(true);

  // Get active workspace
  const activeWorkspace = allWorkspaces.find((w) => w.id === activeWorkspaceId) || null;

  // Combine all chats for display
  const allChats = [...globalChats, ...chats];
  const totalAgents = globalAgents.length + workspaceAgents.length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Workspace Header */}
      <WorkspaceHeader workspace={activeWorkspace} isCollapsed={isCollapsed} />

      {/* Action Bar */}
      <ActionBar
        onNewChat={onNewChat}
        onAgentLibrary={() => setAgentsExpanded(true)}
        isCollapsed={isCollapsed}
      />

      {/* Scrollable Content - Vertical Sections */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">

        {/* === CHATS SECTION === */}
        <div>
          <SectionHeader
            title="Chats"
            icon={<MessageSquare size={16} className="text-blue-500" />}
            count={allChats.length}
            isExpanded={chatsExpanded}
            onToggle={() => setChatsExpanded(!chatsExpanded)}
            onAdd={onNewChat}
            isCollapsed={isCollapsed}
          />
          {chatsExpanded && !isCollapsed && (
            <div className="ml-2 mt-1">
              {allChats.length > 0 ? (
                <ChatList
                  chats={allChats}
                  selectedId={selectedChatId}
                  onSelect={onChatSelect}
                  onChatsUpdated={onChatsUpdated}
                  isCollapsed={isCollapsed}
                />
              ) : (
                <div className="text-xs text-muted-foreground text-center py-3 px-2">
                  No chats yet. Click + to start.
                </div>
              )}
            </div>
          )}
        </div>

        {/* === WORKSPACES SECTION === */}
        <div>
          <SectionHeader
            title="Workspaces"
            icon={<FolderOpen size={16} className="text-amber-500" />}
            count={allWorkspaces.length}
            isExpanded={workspacesExpanded}
            onToggle={() => setWorkspacesExpanded(!workspacesExpanded)}
            onAdd={onWorkspaceAdd}
            isCollapsed={isCollapsed}
          />
          {workspacesExpanded && !isCollapsed && (
            <div className="ml-2 mt-1">
              {allWorkspaces.length > 0 ? (
                <WorkspaceList
                  workspaces={allWorkspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  onSelect={(id) => {
                    if (id === activeWorkspaceId) {
                      onWorkspaceSelect('');
                    } else {
                      onWorkspaceSelect(id);
                    }
                  }}
                  isCollapsed={isCollapsed}
                />
              ) : (
                <div className="text-xs text-muted-foreground text-center py-3 px-2">
                  No workspaces. Click + to create.
                </div>
              )}
            </div>
          )}
        </div>

        {/* === AGENTS SECTION === */}
        <div>
          <SectionHeader
            title="Agents"
            icon={<Bot size={16} className="text-emerald-500" />}
            count={totalAgents}
            isExpanded={agentsExpanded}
            onToggle={() => setAgentsExpanded(!agentsExpanded)}
            onAdd={onCreateGlobalAgent}
            isCollapsed={isCollapsed}
          />
          {agentsExpanded && !isCollapsed && (
            <div className="ml-2 mt-1 space-y-2">
              {/* Global Agents */}
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <Globe size={12} className="text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Global</span>
                </div>
                {globalAgents.length > 0 ? (
                  <AgentList
                    agents={globalAgents}
                    selectedId={selectedAgentId}
                    onSelect={onAgentSelect}
                    onSettingsClick={onAgentSettings}
                    draggable={!!onAgentDrop}
                    onTaskDrop={onTaskDrop}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-2 px-2">
                    No global agents
                  </div>
                )}
              </div>

              {/* Workspace Agents (if workspace selected) */}
              {activeWorkspaceId && (
                <div>
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="flex items-center gap-1.5">
                      <FolderOpen size={12} className="text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Workspace</span>
                    </div>
                    <button
                      onClick={onCreateWorkspaceAgent}
                      className="p-0.5 hover:bg-muted rounded transition-colors"
                      title="Add workspace agent"
                    >
                      <Plus size={12} className="text-muted-foreground" />
                    </button>
                  </div>
                  {workspaceAgents.length > 0 ? (
                    <AgentList
                      agents={workspaceAgents}
                      selectedId={selectedAgentId}
                      onSelect={onAgentSelect}
                      onSettingsClick={onAgentSettings}
                      draggable={!!onAgentDrop}
                      onTaskDrop={onTaskDrop}
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-2 px-2">
                      No workspace agents
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Profile Footer */}
      <UserProfile onSettingsClick={onSettingsClick} isCollapsed={isCollapsed} />
    </div>
  );
}
