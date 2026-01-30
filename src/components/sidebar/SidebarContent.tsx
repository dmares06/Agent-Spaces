import { useState } from 'react';
import type { Workspace, Agent, Chat, ChatStatus } from '../../lib/types';
import { Bot, Globe, Plus } from 'lucide-react';
import WorkspaceHeader from './WorkspaceHeader';
import ActionBar from './ActionBar';
import TabNavigation, { type SidebarTab } from './TabNavigation';
import UserProfile from './UserProfile';
import CollapsibleSection from './CollapsibleSection';
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

export default function SidebarContent({
  allWorkspaces,
  openWorkspaceIds,
  activeWorkspaceId,
  onWorkspaceSelect,
  onWorkspaceClose,
  onWorkspaceDelete: _onWorkspaceDelete,
  onWorkspaceAdd: _onWorkspaceAdd,
  chats,
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
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<SidebarTab>('chats');

  // Get active workspace
  const activeWorkspace = allWorkspaces.find((w) => w.id === activeWorkspaceId) || null;

  // Handle new chat creation
  const handleNewChat = () => {
    // Switch to chats tab
    setActiveTab('chats');
    // Create the new chat
    onNewChat();
  };

  // Handle agent library click
  const handleAgentLibrary = () => {
    setActiveTab('agents');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Workspace Header */}
      <WorkspaceHeader workspace={activeWorkspace} isCollapsed={isCollapsed} />

      {/* Action Bar */}
      <ActionBar
        onNewChat={handleNewChat}
        onAgentLibrary={handleAgentLibrary}
        isCollapsed={isCollapsed}
      />

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        chatCount={chats.length}
        workspaceCount={allWorkspaces.length}
        agentCount={workspaceAgents.length + globalAgents.length}
        isCollapsed={isCollapsed}
      />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Chats Tab Content */}
        {activeTab === 'chats' && (
          <div className="p-3">
            {activeWorkspaceId ? (
              <ChatList
                chats={chats}
                selectedId={selectedChatId}
                onSelect={onChatSelect}
                onChatsUpdated={onChatsUpdated}
                isCollapsed={isCollapsed}
              />
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2">
                {isCollapsed ? '' : 'Select a workspace to view chats'}
              </div>
            )}
          </div>
        )}

        {/* Workspaces Tab Content */}
        {activeTab === 'workspaces' && (
          <div className="p-3">
            <WorkspaceList
              workspaces={allWorkspaces}
              activeWorkspaceId={activeWorkspaceId}
              onSelect={(id) => {
                // Toggle workspace - if clicking active one, close it; otherwise open it
                if (id === activeWorkspaceId) {
                  onWorkspaceSelect(''); // Close workspace
                } else {
                  onWorkspaceSelect(id); // Open workspace
                }
              }}
              isCollapsed={isCollapsed}
            />
          </div>
        )}

        {/* Agents Tab Content */}
        {activeTab === 'agents' && (
          <div>
            {/* Workspace Agents Section */}
            <CollapsibleSection
              title="Workspace Agents"
              count={workspaceAgents.length}
              icon={<Bot size={18} className="text-accent" />}
              defaultExpanded={true}
              isCollapsed={isCollapsed}
              droppable={!!onAgentDrop && !!activeWorkspaceId}
              dropTargetId={activeWorkspaceId}
              onDrop={onAgentDrop}
              actions={
                activeWorkspaceId && !isCollapsed ? (
                  <button
                    onClick={onCreateWorkspaceAgent}
                    className="p-1.5 hover:bg-background/80 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    title="Create Agent in Workspace"
                  >
                    <Plus size={16} className="text-muted-foreground" />
                  </button>
                ) : null
              }
            >
              {activeWorkspaceId ? (
                workspaceAgents.length > 0 ? (
                  <AgentList
                    agents={workspaceAgents}
                    selectedId={selectedAgentId}
                    onSelect={onAgentSelect}
                    onSettingsClick={onAgentSettings}
                    draggable={!!onAgentDrop}
                    onTaskDrop={onTaskDrop}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    {isCollapsed ? '' : 'No agents in this workspace'}
                  </div>
                )
              ) : (
                <div className="text-xs text-muted-foreground text-center py-2">
                  {isCollapsed ? '' : 'Select a workspace'}
                </div>
              )}
            </CollapsibleSection>

            {/* Global Agents Section */}
            <CollapsibleSection
              title="Global Agents"
              count={globalAgents.length}
              icon={<Globe size={18} className="text-accent" />}
              defaultExpanded={true}
              isCollapsed={isCollapsed}
              droppable={!!onAgentDrop}
              dropTargetId={null}
              onDrop={onAgentDrop}
              actions={
                !isCollapsed ? (
                  <button
                    onClick={onCreateGlobalAgent}
                    className="p-1.5 hover:bg-background/80 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    title="Create Global Agent"
                  >
                    <Plus size={16} className="text-muted-foreground" />
                  </button>
                ) : null
              }
            >
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
                <div className="text-xs text-muted-foreground text-center py-2">
                  {isCollapsed ? '' : 'No global agents'}
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}
      </div>

      {/* User Profile Footer */}
      <UserProfile onSettingsClick={onSettingsClick} isCollapsed={isCollapsed} />
    </div>
  );
}
