// TypeScript wrapper for window.electronAPI

export interface PROptions {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface ElectronAPI {
  workspace: {
    list: () => Promise<any[]>;
    create: (data: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    importFolder: (folderPath: string) => Promise<any>;
  };
  agent: {
    list: (workspaceId: string) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
    get: (id: string) => Promise<any>;
    getDefault: () => Promise<any>;
    listGlobal: () => Promise<any[]>;
    moveToWorkspace: (agentId: string, workspaceId: string | null) => Promise<{ success: boolean }>;
    generateFromDescription: (description: string) => Promise<{ success: boolean; config?: any; error?: string }>;
    listByCategory: (workspaceId: string | null, category: string) => Promise<any[]>;
  };
  chat: {
    list: (workspaceId: string) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    getMessages: (chatId: string) => Promise<any[]>;
    sendMessage: (data: { chat_id: string; content: string; browserMode?: boolean }) => Promise<any>;
    delete: (id: string) => Promise<any>;
    update: (id: string, data: { title?: string }) => Promise<{ success: boolean }>;
    generateTitle: (chatId: string) => Promise<{ title: string | null }>;
    updateStatus: (chatId: string, status: string) => Promise<{ success: boolean }>;
    toggleFlag: (chatId: string) => Promise<{ success: boolean }>;
    getByStatus: (workspaceId: string, status: string) => Promise<any[]>;
    getFlagged: (workspaceId: string) => Promise<any[]>;
  };
  skill: {
    list: (workspaceId?: string) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
    execute: (id: string, params: any) => Promise<any>;
    assignToAgent: (agentId: string, skillId: string) => Promise<{ success: boolean }>;
    unassignFromAgent: (agentId: string, skillId: string) => Promise<{ success: boolean }>;
    listForAgent: (agentId: string) => Promise<any[]>;
    listGlobal: () => Promise<any[]>;
  };
  mcp: {
    listServers: (workspaceId?: string) => Promise<any[]>;
    addServer: (data: any) => Promise<any>;
    updateServer: (id: string, data: any) => Promise<{ success: boolean }>;
    removeServer: (id: string) => Promise<any>;
    toggleServer: (id: string) => Promise<any>;
    listTools: (serverId: string) => Promise<any[]>;
    listGlobal: () => Promise<any[]>;
    testServer: (id: string) => Promise<{ success: boolean; error?: string; tools?: string[] }>;
  };
  github: {
    setToken: (token: string) => Promise<{ success: boolean }>;
    hasToken: () => Promise<boolean>;
    testConnection: () => Promise<{ success: boolean; user?: string; error?: string }>;
    disconnect: () => Promise<{ success: boolean }>;
    cloneRepo: (repoUrl: string, targetPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    createPR: (options: PROptions) => Promise<{ success: boolean; url?: string; number?: number; error?: string }>;
    listRepos: () => Promise<{ success: boolean; repos?: Array<{ name: string; full_name: string; private: boolean; clone_url: string }>; error?: string }>;
  };
  hook: {
    list: (workspaceId: string) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, data: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
    toggle: (id: string) => Promise<any>;
  };
  task: {
    list: (filters?: {
      workspaceId?: string;
      chatId?: string;
      status?: string;
      assignedToAgentId?: string;
      createdByAgentId?: string;
    }) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    updateStatus: (id: string, status: string) => Promise<any>;
    updateProgress: (id: string, progress: number) => Promise<any>;
    delete: (id: string) => Promise<any>;
    assign: (taskId: string, assignedToAgentId: string | null) => Promise<any>;
    claim: (taskId: string, agentId: string) => Promise<any>;
  };
  attachment: {
    list: (chatId: string) => Promise<any[]>;
    add: (data: any) => Promise<any>;
    remove: (id: string) => Promise<any>;
  };
  files: {
    browseDirectory: () => Promise<string | null>;
    listDirectory: (dirPath: string) => Promise<any[]>;
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>;
    getFileTree: (rootPath: string) => Promise<FileNode>;
    exists: (filePath: string) => Promise<boolean>;
    createFile: (filePath: string, content?: string) => Promise<{ success: boolean; path: string }>;
    deleteFile: (filePath: string) => Promise<{ success: boolean }>;
  };
  file: {
    readImageAsBase64: (filePath: string) => Promise<string>;
    openExternal: (filePath: string) => Promise<{ success: boolean }>;
  };
  rules: {
    list: (chatId: string) => Promise<any[]>;
    set: (data: any) => Promise<any>;
    remove: (id: string) => Promise<any>;
  };
  approval: {
    list: (chatId: string) => Promise<any[]>;
    respond: (data: { id: string; approved: boolean; remember?: boolean; pattern?: string }) => Promise<any>;
  };
  settings: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<any>;
    getAll: () => Promise<Record<string, string>>;
  };
  permission: {
    setWorkspaceMode: (workspaceId: string, mode: string) => Promise<{ success: boolean }>;
    setAgentMode: (agentId: string, mode: string | null) => Promise<{ success: boolean }>;
    listMemory: (workspaceId: string, agentId?: string) => Promise<any[]>;
    deleteMemory: (id: string) => Promise<{ success: boolean }>;
    clearMemory: (workspaceId: string, agentId?: string) => Promise<{ success: boolean }>;
  };
  claude: {
    setApiKey: (apiKey: string) => Promise<{ success: boolean }>;
    hasApiKey: () => Promise<boolean>;
    testConnection: () => Promise<{ success: boolean; error?: string }>;
  };
  system: {
    selectFolder: () => Promise<string | null>;
    getAppPath: () => Promise<string>;
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  };
  window: {
    minimize: () => Promise<{ success: boolean }>;
    maximize: () => Promise<{ success: boolean }>;
    toggleMaximize: () => Promise<{ success: boolean }>;
    close: () => Promise<{ success: boolean }>;
  };
  onMessageChunk: (callback: (data: any) => void) => void;
  offMessageChunk: () => void;
  onTaskUpdate: (callback: (task: any) => void) => void;
  offTaskUpdate: () => void;
  onTaskDeleted: (callback: (id: string) => void) => void;
  offTaskDeleted: () => void;
  onTaskCreateStart: (callback: (data: { chatId: string; tasks: any[] }) => void) => void;
  offTaskCreateStart: () => void;
  onTaskCreated: (callback: (task: any) => void) => void;
  offTaskCreated: () => void;
  onApprovalRequest: (callback: (request: any) => void) => void;
  offApprovalRequest: () => void;
  onApprovalResponse: (callback: (data: any) => void) => void;
  offApprovalResponse: () => void;
  onAttachmentAdded: (callback: (attachment: any) => void) => void;
  offAttachmentAdded: () => void;
  onChatUpdated: (callback: (chat: any) => void) => void;
  offChatUpdated: () => void;
  terminal: {
    create: (workspacePath: string) => Promise<string>;
    write: (id: string, data: string) => Promise<void>;
    resize: (id: string, cols: number, rows: number) => Promise<void>;
    kill: (id: string) => Promise<void>;
    // Session-based callback registration for proper multi-tab routing
    registerOutputCallback: (sessionId: string, callback: (data: { id: string; data: string }) => void) => void;
    registerExitCallback: (sessionId: string, callback: (data: { id: string; exitCode: number }) => void) => void;
    unregisterCallbacks: (sessionId: string) => void;
    // Legacy methods
    onOutput: (callback: (data: { id: string; data: string }) => void) => void;
    onExit: (callback: (data: { id: string; exitCode: number }) => void) => void;
    offOutput: () => void;
    offExit: () => void;
  };
  category: {
    list: (type: 'agent' | 'skill' | 'mcp', workspaceId?: string | null) => Promise<string[]>;
    rename: (type: 'agent' | 'skill' | 'mcp', oldName: string, newName: string, workspaceId?: string | null) => Promise<{ success: boolean }>;
    delete: (type: 'agent' | 'skill' | 'mcp', categoryName: string, workspaceId?: string | null) => Promise<{ success: boolean }>;
    merge: (type: 'agent' | 'skill' | 'mcp', sourceCategories: string[], targetCategory: string, workspaceId?: string | null) => Promise<{ success: boolean }>;
  };
  personalTask: {
    list: (filters?: { status?: string; workspace_id?: string; priority?: string }) => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    updateStatus: (id: string, status: string, agentId?: string) => Promise<any>;
    delete: (id: string) => Promise<any>;
    getStats: () => Promise<any>;
    // Event listeners
    onTaskCreated: (callback: (task: any) => void) => void;
    onTaskUpdated: (callback: (task: any) => void) => void;
    onTaskDeleted: (callback: (id: string) => void) => void;
    offTaskCreated: () => void;
    offTaskUpdated: () => void;
    offTaskDeleted: () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export const electronAPI = window.electronAPI;
