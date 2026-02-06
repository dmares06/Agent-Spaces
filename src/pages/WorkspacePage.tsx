import { useState, useEffect, useRef } from 'react';
import { electronAPI } from '../lib/electronAPI';
import type { Workspace, Agent, Chat, OpenFile } from '../lib/types';
import ChatPanel from '../components/chat/ChatPanel';
import GlobalSettingsModal from '../components/settings/GlobalSettingsModal';
import AgentSettingsModal from '../components/agent/AgentSettingsModal';
import AgentCreationModal from '../components/agent/AgentCreationModal';
import { ApprovalRequestModal } from '../components/permissions/ApprovalRequestModal';
import CollapsibleSidebar from '../components/sidebar/CollapsibleSidebar';
import SidebarContent from '../components/sidebar/SidebarContent';
import WorkspacePickerModal from '../components/sidebar/WorkspacePickerModal';
import RightPanel from '../components/panels/RightPanel';
import TasksSection from '../components/panels/TasksSection';
import FilesSection from '../components/panels/FilesSection';
import RulesSection from '../components/panels/RulesSection';
import EditorLayout from '../components/editor/EditorLayout';
import TerminalPanel from '../components/terminal/TerminalPanel';
import LivePreviewPanel from '../components/preview/LivePreviewPanel';
import CanvasPanel from '../components/canvas/CanvasPanel';
import PersonalTasksPanel from '../components/personalTasks/PersonalTasksPanel';
import TopNavigationBar from '../components/navigation/TopNavigationBar';
import { detectLanguage } from '../utils/languageDetection';
import { Upload, Bot, Key } from 'lucide-react';

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [openWorkspaceIds, setOpenWorkspaceIds] = useState<string[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [globalAgents, setGlobalAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [globalChats, setGlobalChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false);
  const [agentForSettings, setAgentForSettings] = useState<Agent | null>(null);
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false);
  const [agentCreationOpen, setAgentCreationOpen] = useState(false);
  const [createAgentAsGlobal, setCreateAgentAsGlobal] = useState(false);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(256);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHeight, setPreviewHeight] = useState(400);
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(400);
  const [showPersonalTasks, setShowPersonalTasks] = useState(false);
  const [personalTasksHeight, setPersonalTasksHeight] = useState(400);
  const restoredUIRef = useRef(false);

  // Terminal keyboard shortcut (Ctrl+`)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setShowTerminal((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    (async () => {
      await loadWorkspaces();
      await restoreUIState();
    })();
    loadGlobalAgents();
    loadGlobalChats();
    checkApiKey();
    loadDefaultAgent();
  }, []);

  async function loadDefaultAgent() {
    try {
      const agent = await electronAPI.agent.getDefault();
      if (agent && !selectedAgent) {
        setSelectedAgent(agent);
      }
    } catch (error) {
      console.error('Failed to load default agent:', error);
    }
  }

  useEffect(() => {
    if (activeWorkspace) {
      loadAgents(activeWorkspace.id);
      // All chats are now loaded via loadGlobalChats(), no need to load workspace-specific
      setSelectedAgent(null);
      setSelectedChat(null);
    } else {
      setAgents([]);
      setChats([]);
    }
  }, [activeWorkspace]);

  // When switching or restoring an active workspace, load its previously open files
  useEffect(() => {
    if (activeWorkspace?.id) {
      loadWorkspaceOpenFiles(activeWorkspace.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  // Listen for chat updates (status, flag changes)
  useEffect(() => {
    const handleChatUpdated = (updatedChat: any) => {
      console.log('[WorkspacePage] Chat updated:', updatedChat);
      // Refresh all chats to show updated status/flag
      loadGlobalChats();
    };

    window.electronAPI.onChatUpdated(handleChatUpdated);

    return () => {
      window.electronAPI.offChatUpdated();
    };
  }, []);

  async function checkApiKey() {
    try {
      const has = await electronAPI.claude.hasApiKey();
      setHasApiKey(has);
    } catch (error) {
      console.error('Failed to check API key:', error);
    }
  }

  async function loadWorkspaces() {
    try {
      const data = await electronAPI.workspace.list();
      setWorkspaces(data);
      // Don't auto-select any workspace - user must explicitly open one
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoading(false);
    }
  }

  async function restoreUIState() {
    if (restoredUIRef.current) return;
    try {
      const savedOpen = await electronAPI.settings.get('ui:open_workspaces');
      const savedActive = await electronAPI.settings.get('ui:active_workspace');
      if (savedOpen) {
        const ids: string[] = JSON.parse(savedOpen);
        setOpenWorkspaceIds(ids.filter((id) => workspaces.find((w) => w.id === id)));
      }
      if (savedActive) {
        const ws = workspaces.find((w) => w.id === savedActive);
        if (ws) setActiveWorkspace(ws);
      }
    } catch (e) {
      // ignore restore errors
    } finally {
      restoredUIRef.current = true;
    }
  }

  async function loadGlobalAgents() {
    try {
      const data = await electronAPI.agent.listGlobal();
      setGlobalAgents(data);
    } catch (error) {
      console.error('Failed to load global agents:', error);
    }
  }

  async function loadGlobalChats() {
    try {
      // Load ALL chats so users can always see their conversation history
      const data = await electronAPI.chat.listAll();
      setGlobalChats(data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  }

  async function loadAgents(workspaceId: string) {
    try {
      const data = await electronAPI.agent.list(workspaceId);
      setAgents(data);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  async function loadChats(workspaceId: string) {
    try {
      const data = await electronAPI.chat.list(workspaceId);
      setChats(data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  }

  async function handleImportFolder() {
    try {
      const folderPath = await electronAPI.system.selectFolder();
      if (!folderPath) return;

      const result = await electronAPI.workspace.importFolder(folderPath);
      console.log('Import result:', result);

      await loadWorkspaces();
      if (result.workspace) {
        setActiveWorkspace(result.workspace);
        // Add to open workspaces
        setOpenWorkspaceIds((prev) =>
          prev.includes(result.workspace.id) ? prev : [...prev, result.workspace.id]
        );
        await loadWorkspaceOpenFiles(result.workspace.id);
      }
    } catch (error) {
      console.error('Failed to import folder:', error);
    }
  }

  async function handleCreateWorkspace() {
    try {
      const workspace = await electronAPI.workspace.create({
        name: 'New Workspace',
        description: 'Created manually',
      });
      await loadWorkspaces();
      setActiveWorkspace(workspace);
      // Add to open workspaces
      setOpenWorkspaceIds((prev) =>
        prev.includes(workspace.id) ? prev : [...prev, workspace.id]
      );
      await loadWorkspaceOpenFiles(workspace.id);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  }

  function handleCreateWorkspaceAgent() {
    setCreateAgentAsGlobal(false);
    setAgentCreationOpen(true);
  }

  function handleCreateGlobalAgent() {
    setCreateAgentAsGlobal(true);
    setAgentCreationOpen(true);
  }

  async function handleAgentCreated(agent: Agent) {
    // Refresh the appropriate agent list
    if (agent.workspace_id) {
      await loadAgents(agent.workspace_id);
    } else {
      await loadGlobalAgents();
    }
    setSelectedAgent(agent);
    setAgentCreationOpen(false);
  }

  function handleSelectAgent(agentId: string) {
    // Check workspace agents first
    const agent = agents.find((a) => a.id === agentId);
    const targetAgent = agent || globalAgents.find((a) => a.id === agentId);

    if (targetAgent) {
      setSelectedAgent(targetAgent);

      // Find the most recent chat for this agent (all chats are in globalChats)
      const agentChat = globalChats.find((c) => c.agent_id === agentId);

      if (agentChat) {
        // Use existing chat
        setSelectedChat(agentChat);
      } else {
        // Clear selected chat - ChatPanel will create a new one
        setSelectedChat(null);
      }
    }
  }

  function handleSelectChat(chatId: string) {
    console.log('[WorkspacePage] handleSelectChat called with chatId:', chatId);

    // All chats are now in globalChats
    const chat = globalChats.find((c) => c.id === chatId);
    console.log('[WorkspacePage] Found chat:', chat?.id, chat?.title, 'agent_id:', chat?.agent_id);

    if (chat) {
      setSelectedChat(chat);
      // Find the agent associated with this chat
      const agent = agents.find((a) => a.id === chat.agent_id);
      console.log('[WorkspacePage] Found workspace agent:', agent?.id, agent?.name);

      if (agent) {
        setSelectedAgent(agent);
      } else {
        // Check global agents
        const globalAgent = globalAgents.find((a) => a.id === chat.agent_id);
        console.log('[WorkspacePage] Found global agent:', globalAgent?.id, globalAgent?.name);

        if (globalAgent) {
          setSelectedAgent(globalAgent);
        } else {
          console.warn('[WorkspacePage] No agent found for chat! agent_id:', chat.agent_id);
          console.log('[WorkspacePage] Available workspace agents:', agents.map(a => ({ id: a.id, name: a.name })));
          console.log('[WorkspacePage] Available global agents:', globalAgents.map(a => ({ id: a.id, name: a.name })));
        }
      }
    } else {
      console.warn('[WorkspacePage] Chat not found in chats or globalChats');
      console.log('[WorkspacePage] Available chats:', chats.map(c => c.id));
      console.log('[WorkspacePage] Available globalChats:', globalChats.map(c => c.id));
    }
  }

  async function handleNewChat() {
    // Determine which agent to use
    let agentToUse = selectedAgent;

    // If no agent selected, use the first workspace agent or first global agent
    if (!agentToUse) {
      agentToUse = agents.length > 0 ? agents[0] : (globalAgents.length > 0 ? globalAgents[0] : null);
    }

    if (!agentToUse) {
      console.warn('Cannot create new chat: No agents available');
      return;
    }

    try {
      // Create new chat (workspace_id can be null for global chats)
      const newChat = await window.electronAPI.chat.create({
        workspace_id: activeWorkspace?.id || null,
        agent_id: agentToUse.id,
        title: `Chat with ${agentToUse.name}`,
      });

      // Refresh all chats list
      await loadGlobalChats();

      // Select the newly created chat
      setSelectedChat(newChat);
      setSelectedAgent(agentToUse);

      console.log('[WorkspacePage] New chat created:', newChat.id);
    } catch (error) {
      console.error('[WorkspacePage] Failed to create new chat:', error);
    }
  }

  function handleWorkspaceSelect(workspaceId: string) {
    // If empty string, close the active workspace
    if (!workspaceId) {
      setActiveWorkspace(null);
      return;
    }

    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      setActiveWorkspace(workspace);
      // Add to open workspaces if not already
      setOpenWorkspaceIds((prev) =>
        prev.includes(workspaceId) ? prev : [...prev, workspaceId]
      );
      // Load saved open files for this workspace
      loadWorkspaceOpenFiles(workspace.id);
    }
  }

  function handleWorkspaceClose(workspaceId: string) {
    setOpenWorkspaceIds((prev) => prev.filter((id) => id !== workspaceId));

    // If closing the active workspace, switch to another
    if (activeWorkspace?.id === workspaceId) {
      const remaining = openWorkspaceIds.filter((id) => id !== workspaceId);
      if (remaining.length > 0) {
        const nextWorkspace = workspaces.find((w) => w.id === remaining[0]);
        setActiveWorkspace(nextWorkspace || null);
      } else {
        setActiveWorkspace(null);
      }
    }
  }

  async function handleWorkspaceDelete(workspaceId: string) {
    // Confirm deletion
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${workspace.name}"? This will delete all chats and agents in this workspace.`
    );
    if (!confirmed) return;

    try {
      await electronAPI.workspace.delete(workspaceId);
      await loadWorkspaces();
      handleWorkspaceClose(workspaceId);
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  }

  function handleAddWorkspace() {
    setWorkspacePickerOpen(true);
  }

  function handleSettingsClose() {
    setSettingsOpen(false);
    checkApiKey();
  }

  function handleAgentSettingsClick(agent: Agent) {
    setAgentForSettings(agent);
    setAgentSettingsOpen(true);
  }

  function handleAgentSettingsClose() {
    setAgentSettingsOpen(false);
    setAgentForSettings(null);
  }

  function handleAgentUpdate(updatedAgent: Agent) {
    // Update the agent in the local state
    if (updatedAgent.workspace_id) {
      setAgents((prev) =>
        prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a))
      );
    } else {
      setGlobalAgents((prev) =>
        prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a))
      );
    }
    // If this was the selected agent, update it too
    if (selectedAgent?.id === updatedAgent.id) {
      setSelectedAgent(updatedAgent);
    }
    setAgentSettingsOpen(false);
    setAgentForSettings(null);
  }

  async function handleAgentDelete() {
    // Refresh both agent lists
    if (activeWorkspace) {
      await loadAgents(activeWorkspace.id);
    }
    await loadGlobalAgents();

    // If the deleted agent was selected, clear the selection
    if (agentForSettings && selectedAgent?.id === agentForSettings.id) {
      setSelectedAgent(null);
    }

    setAgentSettingsOpen(false);
    setAgentForSettings(null);
  }

  async function handleAgentMove() {
    // Refresh both agent lists since agent moved between them
    if (activeWorkspace) {
      await loadAgents(activeWorkspace.id);
    }
    await loadGlobalAgents();

    // Clear selection as agent location changed
    if (agentForSettings && selectedAgent?.id === agentForSettings.id) {
      setSelectedAgent(null);
    }

    setAgentSettingsOpen(false);
    setAgentForSettings(null);
  }

  async function handleAgentDrop(agentId: string, targetWorkspaceId: string | null) {
    try {
      await electronAPI.agent.moveToWorkspace(agentId, targetWorkspaceId);
      console.log('[WorkspacePage] Agent moved via drag-drop:', agentId, 'to', targetWorkspaceId || 'global');

      // Refresh both agent lists
      if (activeWorkspace) {
        await loadAgents(activeWorkspace.id);
      }
      await loadGlobalAgents();

      // Clear selection if moved agent was selected
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
      }
    } catch (error) {
      console.error('Failed to move agent:', error);
    }
  }

  async function handleTaskDrop(taskId: string, agentId: string) {
    try {
      await electronAPI.task.assign(taskId, agentId);
      console.log('[WorkspacePage] Task assigned via drag-drop:', taskId, 'to agent', agentId);
      // Task update will be broadcast via IPC events to all listening components
    } catch (error) {
      console.error('Failed to assign task:', error);
    }
  }

  // File operations
  async function handleFileOpen(path: string, name: string) {
    try {
      // Check if file is already open
      const existingFile = openFiles.find((f) => f.path === path);
      if (existingFile) {
        // Just switch to the existing tab
        setActiveFilePath(path);
        return;
      }

      // Load file content
      const content = await electronAPI.files.readFile(path);
      const language = detectLanguage(name);

      const newFile: OpenFile = {
        path,
        name,
        content,
        originalContent: content,
        language,
        isDirty: false,
      };

      // Add to open files and set as active
      setOpenFiles((prev) => [...prev, newFile]);
      setActiveFilePath(path);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }

  function handleFileContentChange(content: string) {
    if (!activeFilePath) return;

    setOpenFiles((prev) =>
      prev.map((file) =>
        file.path === activeFilePath
          ? {
              ...file,
              content,
              isDirty: content !== file.originalContent,
            }
          : file
      )
    );
  }

  async function handleFileSave() {
    if (!activeFilePath) return;

    const activeFile = openFiles.find((f) => f.path === activeFilePath);
    if (!activeFile) return;

    try {
      await electronAPI.files.writeFile(activeFile.path, activeFile.content);

      setOpenFiles((prev) =>
        prev.map((file) =>
          file.path === activeFilePath
            ? {
                ...file,
                originalContent: file.content,
                isDirty: false,
              }
            : file
        )
      );

      console.log('[WorkspacePage] File saved:', activeFile.path);
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }

  // Persist open workspaces, active workspace, and open files per workspace
  useEffect(() => {
    (async () => {
      try {
        await electronAPI.settings.set('ui:open_workspaces', JSON.stringify(openWorkspaceIds));
      } catch {
        // ignore
      }
    })();
  }, [openWorkspaceIds]);

  useEffect(() => {
    (async () => {
      try {
        await electronAPI.settings.set('ui:active_workspace', activeWorkspace?.id || '');
      } catch {
        // ignore
      }
    })();
  }, [activeWorkspace?.id]);

  useEffect(() => {
    (async () => {
      if (!activeWorkspace) return;
      try {
        const state = {
          openFilePaths: openFiles.map((f) => f.path),
          activeFilePath,
        };
        await electronAPI.settings.set(`workspace_state:${activeWorkspace.id}`, JSON.stringify(state));
      } catch {
        // ignore
      }
    })();
  }, [openFiles, activeFilePath, activeWorkspace?.id]);

  async function loadWorkspaceOpenFiles(workspaceId: string) {
    try {
      // Clear current open files when switching
      setOpenFiles([]);
      setActiveFilePath(null);

      const raw = await electronAPI.settings.get(`workspace_state:${workspaceId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { openFilePaths?: string[]; activeFilePath?: string };
      if (parsed.openFilePaths && parsed.openFilePaths.length > 0) {
        for (const p of parsed.openFilePaths) {
          const name = p.split('/').pop() || p;
          try {
            const content = await electronAPI.files.readFile(p);
            const language = detectLanguage(name);
            setOpenFiles((prev) => [
              ...prev,
              { path: p, name, content, originalContent: content, language, isDirty: false },
            ]);
          } catch {
            // ignore file read failures
          }
        }
        if (parsed.activeFilePath) setActiveFilePath(parsed.activeFilePath);
      }
    } catch {
      // ignore
    }
  }

  function handleFileClose(filePath?: string) {
    const pathToClose = filePath || activeFilePath;
    if (!pathToClose) return;

    const fileToClose = openFiles.find((f) => f.path === pathToClose);
    if (!fileToClose) return;

    // Check for unsaved changes
    if (fileToClose.isDirty) {
      const confirmed = window.confirm(
        `${fileToClose.name} has unsaved changes. Are you sure you want to close?`
      );
      if (!confirmed) return;
    }

    // Remove file from open files
    setOpenFiles((prev) => prev.filter((f) => f.path !== pathToClose));

    // If closing the active file, switch to another tab
    if (pathToClose === activeFilePath) {
      const remaining = openFiles.filter((f) => f.path !== pathToClose);
      if (remaining.length > 0) {
        setActiveFilePath(remaining[remaining.length - 1].path);
      } else {
        setActiveFilePath(null);
      }
    }
  }

  function handleSearch() {
    // TODO: Implement file search functionality
    // For now, just focus on the files panel
    console.log('[WorkspacePage] Search clicked - implement file search');
  }

  async function handleWorkspacePathChange(newPath: string) {
    if (!activeWorkspace) {
      console.warn('[WorkspacePage] Cannot update folder path: No active workspace');
      return;
    }

    try {
      console.log('[WorkspacePage] Updating workspace folder path:', newPath);
      const updatedWorkspace = await electronAPI.workspace.update(activeWorkspace.id, {
        folder_path: newPath,
      });

      if (updatedWorkspace) {
        // Update local state
        setActiveWorkspace(updatedWorkspace);
        // Update workspaces list
        await loadWorkspaces();
        console.log('[WorkspacePage] Workspace folder path updated successfully');
      }
    } catch (error) {
      console.error('[WorkspacePage] Failed to update workspace folder path:', error);
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <TopNavigationBar
        leftSidebarCollapsed={sidebarCollapsed}
        rightSidebarCollapsed={rightPanelCollapsed}
        onLeftSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onRightSidebarToggle={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        showTerminal={showTerminal}
        showPreview={showPreview}
        showCanvas={showCanvas}
        showPersonalTasks={showPersonalTasks}
        onTerminalToggle={() => {
          setShowTerminal(prev => {
            const newValue = !prev;
            if (newValue) {
              setShowPreview(false);
              setShowCanvas(false);
              setShowPersonalTasks(false);
            }
            return newValue;
          });
        }}
        onPreviewToggle={() => {
          setShowPreview(prev => {
            const newValue = !prev;
            if (newValue) {
              setShowTerminal(false);
              setShowCanvas(false);
              setShowPersonalTasks(false);
            }
            return newValue;
          });
        }}
        onCanvasToggle={() => {
          setShowCanvas(prev => {
            const newValue = !prev;
            if (newValue) {
              setShowTerminal(false);
              setShowPreview(false);
              setShowPersonalTasks(false);
            }
            return newValue;
          });
        }}
        onPersonalTasksToggle={() => {
          setShowPersonalTasks(prev => {
            const newValue = !prev;
            if (newValue) {
              setShowTerminal(false);
              setShowPreview(false);
              setShowCanvas(false);
            }
            return newValue;
          });
        }}
        workspaceName={activeWorkspace?.name}
        onSearchClick={handleSearch}
      />

      {/* Main Content - 3 Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <CollapsibleSidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}>
          <SidebarContent
            allWorkspaces={workspaces}
            openWorkspaceIds={openWorkspaceIds}
            activeWorkspaceId={activeWorkspace?.id || null}
            onWorkspaceSelect={handleWorkspaceSelect}
            onWorkspaceClose={handleWorkspaceClose}
            onWorkspaceDelete={handleWorkspaceDelete}
            onWorkspaceAdd={handleAddWorkspace}
            chats={[]}
            globalChats={globalChats}
            selectedChatId={selectedChat?.id}
            onChatSelect={handleSelectChat}
            onChatsUpdated={() => {
              // Reload all chats to refresh the sidebar
              loadGlobalChats();
            }}
            onNewChat={handleNewChat}
            globalAgents={globalAgents}
            workspaceAgents={agents}
            selectedAgentId={selectedAgent?.id}
            onAgentSelect={handleSelectAgent}
            onAgentSettings={handleAgentSettingsClick}
            onCreateGlobalAgent={handleCreateGlobalAgent}
            onCreateWorkspaceAgent={handleCreateWorkspaceAgent}
            onAgentDrop={handleAgentDrop}
            onTaskDrop={handleTaskDrop}
            hasApiKey={hasApiKey}
            onSettingsClick={() => setSettingsOpen(true)}
            isCollapsed={sidebarCollapsed}
          />
        </CollapsibleSidebar>

        {/* Center Panel - Chat Area or File Editor + Terminal */}
        <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden relative px-6 py-6">
            {openFiles.length > 0 && activeFilePath ? (
              // Show File Editor when a file is open
              <EditorLayout
                files={openFiles}
                activeFilePath={activeFilePath}
                workspaceId={activeWorkspace?.id}
                onFileChange={handleFileContentChange}
                onFileSave={handleFileSave}
                onFileClose={handleFileClose}
                onFileSelect={setActiveFilePath}
              />
            ) : !hasApiKey ? (
              // Show API key prompt
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <Key size={48} className="text-warning mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Welcome to AgentSpaces
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    To start chatting with Claude, you'll need to add your Anthropic API key.
                  </p>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                  >
                    Configure API Key
                  </button>
                </div>
              </div>
            ) : selectedAgent ? (
              <ChatPanel
                agent={selectedAgent}
                workspaceId={activeWorkspace?.id}
                selectedChat={selectedChat}
                onOpenSettings={() => setSettingsOpen(true)}
                onChatUpdated={() => {
                  if (activeWorkspace) {
                    loadChats(activeWorkspace.id);
                  }
                  loadGlobalChats();
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-lg">
                  <Bot size={64} className="text-muted-foreground/50 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    {agents.length === 0 && globalAgents.length === 0
                      ? 'Create an agent to start chatting'
                      : 'Select an agent to start chatting'}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {agents.length === 0 && globalAgents.length === 0
                      ? 'Click the + button in Global Agents to create one'
                      : 'Choose an agent from the sidebar to begin a conversation'}
                  </p>
                  {agents.length === 0 && globalAgents.length === 0 && (
                    <button
                      onClick={handleCreateGlobalAgent}
                      className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                    >
                      Create First Agent
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Terminal Panel */}
          {showTerminal && (
            <div
              className="border-t border-border/50 flex-shrink-0"
              style={{ height: terminalHeight }}
            >
              <TerminalPanel
                workspacePath={activeWorkspace?.folder_path}
                onClose={() => setShowTerminal(false)}
                height={terminalHeight}
                onHeightChange={setTerminalHeight}
              />
            </div>
          )}

          {/* Live Preview Panel */}
          {showPreview && (
            <LivePreviewPanel
              initialUrl="http://localhost:3000"
              height={previewHeight}
              onHeightChange={setPreviewHeight}
              onClose={() => setShowPreview(false)}
            />
          )}

          {/* Visual Canvas Panel */}
          {showCanvas && (
            <CanvasPanel
              workspaceId={activeWorkspace?.id}
              height={canvasHeight}
              onHeightChange={setCanvasHeight}
              onClose={() => setShowCanvas(false)}
            />
          )}

          {/* Personal Tasks Panel */}
          {showPersonalTasks && (
            <PersonalTasksPanel
              height={personalTasksHeight}
              onResize={setPersonalTasksHeight}
              onClose={() => setShowPersonalTasks(false)}
            />
          )}
        </div>

        {/* Right Panel - Tasks, Files, Rules */}
        <RightPanel
          tasksContent={
            <TasksSection
              workspaceId={activeWorkspace?.id}
              chatId={selectedChat?.id}
              onTaskCountChange={setTaskCount}
            />
          }
          filesContent={
            <FilesSection
              chatId={selectedChat?.id}
              workspacePath={activeWorkspace?.folder_path}
              onFileCountChange={setFileCount}
              onFileOpen={handleFileOpen}
              onWorkspacePathChange={handleWorkspacePathChange}
            />
          }
          rulesContent={<RulesSection chatId={selectedChat?.id} />}
          taskCount={taskCount}
          fileCount={fileCount}
          isCollapsed={rightPanelCollapsed}
          onToggle={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        />
      </div>

      {/* Workspace Picker Modal */}
      <WorkspacePickerModal
        isOpen={workspacePickerOpen}
        onClose={() => setWorkspacePickerOpen(false)}
        workspaces={workspaces}
        openWorkspaceIds={openWorkspaceIds}
        onSelect={handleWorkspaceSelect}
        onCreate={handleCreateWorkspace}
        onImport={handleImportFolder}
      />

      {/* Agent Creation Modal */}
      <AgentCreationModal
        isOpen={agentCreationOpen}
        onClose={() => setAgentCreationOpen(false)}
        workspaceId={activeWorkspace?.id || null}
        defaultGlobal={createAgentAsGlobal}
        onAgentCreated={handleAgentCreated}
      />

      {/* Global Settings Modal */}
      <GlobalSettingsModal isOpen={settingsOpen} onClose={handleSettingsClose} />

      {/* Agent Settings Modal */}
      {agentForSettings && (
        <AgentSettingsModal
          isOpen={agentSettingsOpen}
          onClose={handleAgentSettingsClose}
          agent={agentForSettings}
          onUpdate={handleAgentUpdate}
          onDelete={handleAgentDelete}
          onMove={handleAgentMove}
        />
      )}

      {/* Approval Request Modal - Global overlay for permission requests */}
      <ApprovalRequestModal />
    </div>
  );
}
