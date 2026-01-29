const { contextBridge, ipcRenderer } = require('electron');

// Terminal callback management - routes output to correct terminal tab by session ID
const terminalOutputCallbacks = new Map();
const terminalExitCallbacks = new Map();
let terminalListenersInitialized = false;

function initTerminalListeners() {
  if (terminalListenersInitialized) return;
  terminalListenersInitialized = true;

  ipcRenderer.on('terminal-output', (_event, data) => {
    const callback = terminalOutputCallbacks.get(data.id);
    if (callback) {
      callback(data);
    }
  });

  ipcRenderer.on('terminal-exit', (_event, data) => {
    const callback = terminalExitCallbacks.get(data.id);
    if (callback) {
      callback(data);
    }
    // Clean up callbacks when session exits
    terminalOutputCallbacks.delete(data.id);
    terminalExitCallbacks.delete(data.id);
  });
}

// Expose protected methods that allow the renderer process to use ipcRenderer
// without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Workspace operations
  workspace: {
    list: () => ipcRenderer.invoke('workspace:list'),
    create: (data) => ipcRenderer.invoke('workspace:create', data),
    delete: (id) => ipcRenderer.invoke('workspace:delete', id),
    update: (id, updates) => ipcRenderer.invoke('workspace:update', id, updates),
    importFolder: (folderPath) => ipcRenderer.invoke('workspace:import-folder', folderPath),
  },

  // Agent operations
  agent: {
    list: (workspaceId) => ipcRenderer.invoke('agent:list', workspaceId),
    create: (data) => ipcRenderer.invoke('agent:create', data),
    update: (id, data) => ipcRenderer.invoke('agent:update', id, data),
    delete: (id) => ipcRenderer.invoke('agent:delete', id),
    get: (id) => ipcRenderer.invoke('agent:get', id),
    getDefault: () => ipcRenderer.invoke('agent:get-default'),
    listGlobal: () => ipcRenderer.invoke('agent:list-global'),
    moveToWorkspace: (agentId, workspaceId) => ipcRenderer.invoke('agent:move-to-workspace', agentId, workspaceId),
    generateFromDescription: (description) => ipcRenderer.invoke('agent:generate-from-description', description),
    listByCategory: (workspaceId, category) => ipcRenderer.invoke('agent:list-by-category', workspaceId, category),
  },

  // Chat operations
  chat: {
    list: (workspaceId) => ipcRenderer.invoke('chat:list', workspaceId),
    create: (data) => ipcRenderer.invoke('chat:create', data),
    getMessages: (chatId) => ipcRenderer.invoke('chat:get-messages', chatId),
    sendMessage: (data) => ipcRenderer.invoke('chat:send-message', data),
    delete: (id) => ipcRenderer.invoke('chat:delete', id),
    update: (id, data) => ipcRenderer.invoke('chat:update', id, data),
    generateTitle: (chatId) => ipcRenderer.invoke('chat:generate-title', chatId),
    updateStatus: (chatId, status) => ipcRenderer.invoke('chat:update-status', chatId, status),
    toggleFlag: (chatId) => ipcRenderer.invoke('chat:toggle-flag', chatId),
    getByStatus: (workspaceId, status) => ipcRenderer.invoke('chat:get-by-status', workspaceId, status),
    getFlagged: (workspaceId) => ipcRenderer.invoke('chat:get-flagged', workspaceId),
  },

  // Skill operations
  skill: {
    list: (workspaceId) => ipcRenderer.invoke('skill:list', workspaceId),
    create: (data) => ipcRenderer.invoke('skill:create', data),
    update: (id, data) => ipcRenderer.invoke('skill:update', id, data),
    delete: (id) => ipcRenderer.invoke('skill:delete', id),
    execute: (id, params) => ipcRenderer.invoke('skill:execute', id, params),
    assignToAgent: (agentId, skillId) => ipcRenderer.invoke('skill:assign-to-agent', agentId, skillId),
    unassignFromAgent: (agentId, skillId) => ipcRenderer.invoke('skill:unassign-from-agent', agentId, skillId),
    listForAgent: (agentId) => ipcRenderer.invoke('skill:list-for-agent', agentId),
    listGlobal: () => ipcRenderer.invoke('skill:list-global'),
  },

  // MCP operations
  mcp: {
    listServers: (workspaceId) => ipcRenderer.invoke('mcp:list-servers', workspaceId),
    addServer: (data) => ipcRenderer.invoke('mcp:add-server', data),
    updateServer: (id, data) => ipcRenderer.invoke('mcp:update-server', id, data),
    removeServer: (id) => ipcRenderer.invoke('mcp:remove-server', id),
    toggleServer: (id) => ipcRenderer.invoke('mcp:toggle-server', id),
    listTools: (serverId) => ipcRenderer.invoke('mcp:list-tools', serverId),
    listGlobal: () => ipcRenderer.invoke('mcp:list-global'),
    testServer: (id) => ipcRenderer.invoke('mcp:test-server', id),
  },

  // GitHub operations
  github: {
    setToken: (token) => ipcRenderer.invoke('github:set-token', token),
    hasToken: () => ipcRenderer.invoke('github:has-token'),
    testConnection: () => ipcRenderer.invoke('github:test-connection'),
    disconnect: () => ipcRenderer.invoke('github:disconnect'),
    cloneRepo: (repoUrl, targetPath) => ipcRenderer.invoke('github:clone-repo', repoUrl, targetPath),
    createPR: (options) => ipcRenderer.invoke('github:create-pr', options),
    listRepos: () => ipcRenderer.invoke('github:list-repos'),
  },

  // Hook operations
  hook: {
    list: (workspaceId) => ipcRenderer.invoke('hook:list', workspaceId),
    create: (data) => ipcRenderer.invoke('hook:create', data),
    update: (id, data) => ipcRenderer.invoke('hook:update', id, data),
    delete: (id) => ipcRenderer.invoke('hook:delete', id),
    toggle: (id) => ipcRenderer.invoke('hook:toggle', id),
  },

  // Task operations
  task: {
    list: (filters) => ipcRenderer.invoke('task:list', filters),
    create: (data) => ipcRenderer.invoke('task:create', data),
    updateStatus: (id, status) => ipcRenderer.invoke('task:update-status', id, status),
    updateProgress: (id, progress) => ipcRenderer.invoke('task:update-progress', id, progress),
    delete: (id) => ipcRenderer.invoke('task:delete', id),
    assign: (taskId, assignedToAgentId) => ipcRenderer.invoke('task:assign', taskId, assignedToAgentId),
  },

  // Attachment operations
  attachment: {
    list: (chatId) => ipcRenderer.invoke('attachment:list', chatId),
    add: (data) => ipcRenderer.invoke('attachment:add', data),
    remove: (id) => ipcRenderer.invoke('attachment:remove', id),
  },

  // File operations
  files: {
    browseDirectory: () => ipcRenderer.invoke('files:browse-directory'),
    listDirectory: (dirPath) => ipcRenderer.invoke('files:list-directory', dirPath),
    readFile: (filePath) => ipcRenderer.invoke('files:read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('files:write-file', filePath, content),
  },

  // Rules operations
  rules: {
    list: (chatId) => ipcRenderer.invoke('rules:list', chatId),
    set: (data) => ipcRenderer.invoke('rules:set', data),
    remove: (id) => ipcRenderer.invoke('rules:remove', id),
  },

  // Approval operations
  approval: {
    list: (chatId) => ipcRenderer.invoke('approval:list', chatId),
    respond: (data) => ipcRenderer.invoke('approval:respond', data),
  },

  // Settings operations
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:get-all'),
  },

  // Permission operations
  permission: {
    setWorkspaceMode: (workspaceId, mode) => ipcRenderer.invoke('permission:set-workspace-mode', workspaceId, mode),
    setAgentMode: (agentId, mode) => ipcRenderer.invoke('permission:set-agent-mode', agentId, mode),
    listMemory: (workspaceId, agentId) => ipcRenderer.invoke('permission:list-memory', workspaceId, agentId),
    deleteMemory: (id) => ipcRenderer.invoke('permission:delete-memory', id),
    clearMemory: (workspaceId, agentId) => ipcRenderer.invoke('permission:clear-memory', workspaceId, agentId),
  },

  // Claude API operations
  claude: {
    setApiKey: (apiKey) => ipcRenderer.invoke('claude:set-api-key', apiKey),
    hasApiKey: () => ipcRenderer.invoke('claude:has-api-key'),
    testConnection: () => ipcRenderer.invoke('claude:test-connection'),
  },

  // System operations
  system: {
    selectFolder: () => ipcRenderer.invoke('system:select-folder'),
    getAppPath: () => ipcRenderer.invoke('system:get-app-path'),
    openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
  },

  // Window operations
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // Event listeners for streaming messages
  onMessageChunk: (callback) => {
    ipcRenderer.on('message-chunk', (_event, data) => callback(data));
  },

  offMessageChunk: () => {
    ipcRenderer.removeAllListeners('message-chunk');
  },

  // Event listeners for task updates
  onTaskUpdate: (callback) => {
    ipcRenderer.on('task-update', (_event, task) => callback(task));
  },

  offTaskUpdate: () => {
    ipcRenderer.removeAllListeners('task-update');
  },

  onTaskDeleted: (callback) => {
    ipcRenderer.on('task-deleted', (_event, id) => callback(id));
  },

  offTaskDeleted: () => {
    ipcRenderer.removeAllListeners('task-deleted');
  },

  // Event listeners for approval requests
  onApprovalRequest: (callback) => {
    ipcRenderer.on('approval-request', (_event, request) => callback(request));
  },

  offApprovalRequest: () => {
    ipcRenderer.removeAllListeners('approval-request');
  },

  onApprovalResponse: (callback) => {
    ipcRenderer.on('approval-response', (_event, data) => callback(data));
  },

  offApprovalResponse: () => {
    ipcRenderer.removeAllListeners('approval-response');
  },

  // Event listeners for attachment updates (from tool execution)
  onAttachmentAdded: (callback) => {
    ipcRenderer.on('attachment-added', (_event, attachment) => callback(attachment));
  },

  offAttachmentAdded: () => {
    ipcRenderer.removeAllListeners('attachment-added');
  },

  // Event listeners for chat updates
  onChatUpdated: (callback) => {
    ipcRenderer.on('chat-updated', (_event, chat) => callback(chat));
  },

  offChatUpdated: () => {
    ipcRenderer.removeAllListeners('chat-updated');
  },

  // Category operations
  category: {
    list: (type, workspaceId) => ipcRenderer.invoke('category:list', type, workspaceId),
    rename: (type, oldName, newName, workspaceId) => ipcRenderer.invoke('category:rename', type, oldName, newName, workspaceId),
    delete: (type, categoryName, workspaceId) => ipcRenderer.invoke('category:delete', type, categoryName, workspaceId),
    merge: (type, sourceCategories, targetCategory, workspaceId) => ipcRenderer.invoke('category:merge', type, sourceCategories, targetCategory, workspaceId),
  },

  // Terminal API - uses session-based callback routing
  terminal: {
    create: (workspacePath) => ipcRenderer.invoke('terminal:create', workspacePath),
    write: (id, data) => ipcRenderer.invoke('terminal:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    kill: (id) => ipcRenderer.invoke('terminal:kill', id),
    // Register callbacks by session ID for proper multi-tab routing
    registerOutputCallback: (sessionId, callback) => {
      initTerminalListeners();
      terminalOutputCallbacks.set(sessionId, callback);
    },
    registerExitCallback: (sessionId, callback) => {
      initTerminalListeners();
      terminalExitCallbacks.set(sessionId, callback);
    },
    unregisterCallbacks: (sessionId) => {
      terminalOutputCallbacks.delete(sessionId);
      terminalExitCallbacks.delete(sessionId);
    },
    // Legacy methods for backward compatibility
    onOutput: (callback) => {
      ipcRenderer.on('terminal-output', (_event, data) => callback(data));
    },
    onExit: (callback) => {
      ipcRenderer.on('terminal-exit', (_event, data) => callback(data));
    },
    offOutput: () => {
      ipcRenderer.removeAllListeners('terminal-output');
    },
    offExit: () => {
      ipcRenderer.removeAllListeners('terminal-exit');
    },
  },

  // File operations
  files: {
    readFile: (filePath) => ipcRenderer.invoke('files:readFile', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('files:writeFile', filePath, content),
    getFileTree: (rootPath) => ipcRenderer.invoke('files:getFileTree', rootPath),
    exists: (filePath) => ipcRenderer.invoke('files:exists', filePath),
    createFile: (filePath, content) => ipcRenderer.invoke('files:createFile', filePath, content),
    deleteFile: (filePath) => ipcRenderer.invoke('files:deleteFile', filePath),
  },

  // Single file operations (images, external opening)
  file: {
    readImageAsBase64: (filePath) => ipcRenderer.invoke('file:readImageAsBase64', filePath),
    openExternal: (filePath) => ipcRenderer.invoke('file:openExternal', filePath),
  },

  // Personal Task Management
  personalTask: {
    list: (filters) => ipcRenderer.invoke('personal-task:list', filters),
    create: (data) => ipcRenderer.invoke('personal-task:create', data),
    update: (id, updates) => ipcRenderer.invoke('personal-task:update', id, updates),
    updateStatus: (id, status, agentId) => ipcRenderer.invoke('personal-task:update-status', id, status, agentId),
    delete: (id) => ipcRenderer.invoke('personal-task:delete', id),
    getStats: () => ipcRenderer.invoke('personal-task:stats'),

    // Event listeners
    onTaskCreated: (callback) => {
      ipcRenderer.on('personal-task-created', (_event, task) => callback(task));
    },
    onTaskUpdated: (callback) => {
      ipcRenderer.on('personal-task-updated', (_event, task) => callback(task));
    },
    onTaskDeleted: (callback) => {
      ipcRenderer.on('personal-task-deleted', (_event, id) => callback(id));
    },
    offTaskCreated: () => {
      ipcRenderer.removeAllListeners('personal-task-created');
    },
    offTaskUpdated: () => {
      ipcRenderer.removeAllListeners('personal-task-updated');
    },
    offTaskDeleted: () => {
      ipcRenderer.removeAllListeners('personal-task-deleted');
    },
  },

  // Canvas operations
  canvas: {
    save: (canvas) => ipcRenderer.invoke('canvas:save', canvas),
    list: (workspaceId) => ipcRenderer.invoke('canvas:list', workspaceId),
    get: (canvasId) => ipcRenderer.invoke('canvas:get', canvasId),
    delete: (canvasId) => ipcRenderer.invoke('canvas:delete', canvasId),
  },
});

console.log('[Preload] electronAPI exposed to renderer');
