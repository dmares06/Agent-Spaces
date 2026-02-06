import { ipcMain, dialog, app, BrowserWindow, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as db from '../database/db.js';
import { scanWorkflowFolder } from '../services/workflowScanner.js';
import * as claudeService from '../services/claudeService.js';
import * as aiService from '../services/aiService.js';
import * as terminalService from '../services/terminalService.js';
import * as mcpTester from '../services/mcpTester.js';
import * as githubService from '../services/githubService.js';
import * as slashCommandService from '../services/slashCommandService.js';
import * as schedulerService from '../services/schedulerService.js';
import * as telegramService from '../services/telegramService.js';
import * as githubService2 from '../services/githubService.js';
import * as agentRunnerService from '../services/agentRunnerService.js';

export function registerHandlers() {
  console.log('[IPC] Registering handlers');

  // ===== Workspace Handlers =====

  ipcMain.handle('workspace:list', async () => {
    try {
      return db.getWorkspaces();
    } catch (error: any) {
      console.error('[IPC] workspace:list error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('workspace:create', async (_event, data) => {
    try {
      return db.createWorkspace(data);
    } catch (error: any) {
      console.error('[IPC] workspace:create error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('workspace:delete', async (_event, id: string) => {
    try {
      db.deleteWorkspace(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] workspace:delete error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('workspace:update', async (_event, id: string, updates: any) => {
    try {
      console.log('[IPC] Updating workspace:', id, updates);
      const updatedWorkspace = db.updateWorkspace(id, updates);
      return updatedWorkspace;
    } catch (error: any) {
      console.error('[IPC] workspace:update error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('workspace:import-folder', async (_event, folderPath: string) => {
    try {
      console.log('[IPC] Importing folder:', folderPath);

      // Scan the folder
      const scanResult = await scanWorkflowFolder(folderPath);

      // Create workspace
      const name = folderPath.split('/').pop() || 'Imported Workspace';
      const workspace = db.createWorkspace({
        name,
        description: `Imported from ${folderPath}`,
        folder_path: folderPath,
      });

      console.log('[IPC] Workspace created:', workspace.id);

      // Import agents
      for (const agentDef of scanResult.agents) {
        db.createAgent({
          workspace_id: workspace.id,
          name: agentDef.name,
          description: agentDef.description,
          avatar: agentDef.avatar,
          system_prompt: agentDef.system_prompt,
          model: agentDef.model || 'claude-sonnet-4.5',
          thinking_enabled: agentDef.thinking_enabled ? 1 : 0,
          config: agentDef.category ? JSON.stringify({ category: agentDef.category }) : undefined,
        });
      }

      console.log('[IPC] Imported', scanResult.agents.length, 'agents');

      // Import skills
      for (const skillDef of scanResult.skills) {
        db.createSkill({
          workspace_id: workspace.id,
          name: skillDef.name,
          description: skillDef.description,
          type: skillDef.type,
          config: JSON.stringify(skillDef.config),
        });
      }

      console.log('[IPC] Imported', scanResult.skills.length, 'skills');

      // Import MCP servers
      for (const mcpDef of scanResult.mcpServers) {
        db.createMCPServer({
          workspace_id: workspace.id,
          name: mcpDef.name,
          command: mcpDef.command,
          args: JSON.stringify(mcpDef.args),
          env: mcpDef.env ? JSON.stringify(mcpDef.env) : undefined,
          enabled: 1,
        });
      }

      console.log('[IPC] Imported', scanResult.mcpServers.length, 'MCP servers');

      return {
        workspace,
        imported: {
          agents: scanResult.agents.length,
          skills: scanResult.skills.length,
          mcpServers: scanResult.mcpServers.length,
        },
      };
    } catch (error: any) {
      console.error('[IPC] workspace:import-folder error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('workspace:get-slash-commands', async (_event, workspaceId: string) => {
    try {
      const workspace = db.getWorkspace(workspaceId);
      if (!workspace?.folder_path) {
        console.log('[IPC] No folder_path for workspace:', workspaceId);
        return [];
      }
      return await slashCommandService.getSlashCommands(workspace.folder_path);
    } catch (error: any) {
      console.error('[IPC] workspace:get-slash-commands error:', error);
      return [];
    }
  });

  // ===== Agent Handlers =====

  ipcMain.handle('agent:list', async (_event, workspaceId: string) => {
    try {
      return db.getAgents(workspaceId);
    } catch (error: any) {
      console.error('[IPC] agent:list error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('agent:create', async (_event, data) => {
    try {
      return db.createAgent(data);
    } catch (error: any) {
      console.error('[IPC] agent:create error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('agent:update', async (_event, id: string, data) => {
    try {
      db.updateAgent(id, data);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] agent:update error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('agent:delete', async (_event, id: string) => {
    try {
      db.deleteAgent(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] agent:delete error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('agent:get', async (_event, id: string) => {
    try {
      return db.getAgent(id);
    } catch (error: any) {
      console.error('[IPC] agent:get error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('agent:get-default', async () => {
    try {
      return db.getOrCreateDefaultAgent();
    } catch (error: any) {
      console.error('[IPC] agent:get-default error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('agent:list-global', async () => {
    try {
      return db.getGlobalAgents();
    } catch (error: any) {
      console.error('[IPC] agent:list-global error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('agent:move-to-workspace', async (_event, agentId: string, workspaceId: string | null) => {
    try {
      db.moveAgentToWorkspace(agentId, workspaceId);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] agent:move-to-workspace error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('agent:list-by-category', async (_event, workspaceId: string | null, category: string) => {
    try {
      const database = db.getDatabase();
      const whereClause = workspaceId ? 'WHERE workspace_id = ? AND category = ?' : 'WHERE workspace_id IS NULL AND category = ?';
      const params = workspaceId ? [workspaceId, category] : [category];

      const stmt = database.prepare(`SELECT * FROM agents ${whereClause} ORDER BY name`);
      return stmt.all(...params);
    } catch (error: any) {
      console.error('[IPC] agent:list-by-category error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('agent:generate-from-description', async (_event, description: string) => {
    try {
      const config = await claudeService.generateAgentConfig(description);
      return { success: true, config };
    } catch (error: any) {
      console.error('[IPC] agent:generate-from-description error:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== Chat Handlers =====

  ipcMain.handle('chat:list', async (_event, workspaceId: string) => {
    try {
      return db.getChats(workspaceId);
    } catch (error: any) {
      console.error('[IPC] chat:list error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('chat:list-global', async () => {
    try {
      return db.getGlobalChats();
    } catch (error: any) {
      console.error('[IPC] chat:list-global error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('chat:list-all', async () => {
    try {
      return db.getAllChats();
    } catch (error: any) {
      console.error('[IPC] chat:list-all error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('chat:create', async (_event, data) => {
    try {
      return db.createChat(data);
    } catch (error: any) {
      console.error('[IPC] chat:create error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('chat:get-messages', async (_event, chatId: string) => {
    try {
      console.log('[IPC] chat:get-messages called for chatId:', chatId);
      const messages = db.getMessages(chatId);
      console.log('[IPC] chat:get-messages returning', messages.length, 'messages');
      if (messages.length > 0) {
        console.log('[IPC] First message role:', messages[0].role, 'content preview:', messages[0].content?.substring(0, 50));
      }
      return messages;
    } catch (error: any) {
      console.error('[IPC] chat:get-messages error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('chat:send-message', async (_event, data) => {
    try {
      const { chat_id, content, browserMode } = data;

      console.log(`[IPC] Sending message to chat ${chat_id}${browserMode ? ' [BROWSER MODE ENABLED]' : ''}`);

      // Save the user message
      const userMessage = db.createMessage({
        chat_id: chat_id,
        role: 'user',
        content: content,
        attachments: data.attachments,
      });

      console.log('[IPC] User message saved:', userMessage.id);

      // Get the chat to find the agent
      const chat = db.getChat(data.chat_id);
      if (!chat) {
        throw new Error('Chat not found');
      }

      // Get the agent configuration
      const agent = db.getAgent(chat.agent_id);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Get conversation history
      const messages = db.getMessages(data.chat_id);
      const chatHistory: claudeService.ExtendedMessage[] = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Get main window for streaming
      const mainWindow = BrowserWindow.getAllWindows()[0] || null;

      // Tool context for execution
      const toolContext = {
        workspaceId: chat.workspace_id,
        chatId: chat.id,
        agentId: agent.id,
        browserMode: browserMode || false,
      };

      // Update system prompt when browser mode is enabled
      let systemPrompt = agent.system_prompt;
      if (browserMode) {
        systemPrompt += `\n\n**BROWSER MODE ENABLED**
You have access to browser automation tools. You can:
- Navigate to URLs (browser_navigate)
- Click elements (browser_click)
- Fill forms (browser_fill_form)
- Take screenshots (browser_screenshot)
- Read page content (browser_read_content)
- Wait for elements (browser_wait)

Use these tools when the user asks you to interact with websites.
Always confirm the URL before navigating.
Take screenshots to show your progress.`;
      }

      // Stream response from AI provider (routes to correct provider based on model)
      const response = await aiService.streamMessageWithTools(
        chatHistory,
        {
          systemPrompt,
          model: agent.model,
          thinkingEnabled: agent.thinking_enabled === 1,
          toolsEnabled: true,
          browserMode: browserMode || false,
        },
        toolContext,
        {
          onText: () => console.log('[IPC] AI text chunk received'),
          onThinking: () => console.log('[IPC] AI thinking chunk received'),
          onToolUse: (name, _input, id) => console.log('[IPC] AI tool use:', name, id),
          onToolResult: (id, _result, isError) => console.log('[IPC] AI tool result:', id, isError),
          onError: (error) => console.error('[IPC] AI error:', error),
        },
        mainWindow
      );

      // Save the assistant message with tool executions
      const assistantMessage = db.createMessage({
        chat_id: data.chat_id,
        role: 'assistant',
        content: response.content,
        thinking_content: response.thinkingContent,
      });

      console.log('[IPC] Assistant message saved:', assistantMessage.id, 'tool executions:', response.toolExecutions.length);

      return {
        userMessage,
        assistantMessage,
        toolExecutions: response.toolExecutions,
      };
    } catch (error: any) {
      console.error('[IPC] chat:send-message error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('chat:delete', async (_event, id: string) => {
    try {
      db.deleteChat(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] chat:delete error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('chat:update', async (_event, id: string, data: { title?: string }) => {
    try {
      db.updateChat(id, data);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] chat:update error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('chat:generate-title', async (_event, chatId: string) => {
    try {
      // Get the first few messages to generate a title
      const messages = db.getMessages(chatId);
      if (messages.length === 0) {
        return { title: null };
      }

      // Get just the first user message for title generation
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (!firstUserMessage) {
        return { title: null };
      }

      // Use Claude to generate a short title
      const titlePrompt = `Generate a very short title (3-6 words max) for a conversation that starts with this message. Return ONLY the title, no quotes or explanation:\n\n"${firstUserMessage.content.substring(0, 500)}"`;

      const response = await claudeService.sendSimpleMessage(titlePrompt);
      const title = response.trim().replace(/^["']|["']$/g, '').substring(0, 50);

      // Update the chat with the new title
      if (title) {
        db.updateChat(chatId, { title });
      }

      return { title };
    } catch (error: any) {
      console.error('[IPC] chat:generate-title error:', error);
      // Don't throw - just return null title on error
      return { title: null };
    }
  });

  // ===== Skill Handlers =====

  ipcMain.handle('skill:list', async (_event, workspaceId?: string) => {
    try {
      return db.getSkills(workspaceId);
    } catch (error: any) {
      console.error('[IPC] skill:list error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('skill:create', async (_event, data) => {
    try {
      return db.createSkill(data);
    } catch (error: any) {
      console.error('[IPC] skill:create error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('skill:update', async (_event, id: string, data) => {
    try {
      db.updateSkill(id, data);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] skill:update error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('skill:delete', async (_event, id: string) => {
    try {
      db.deleteSkill(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] skill:delete error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('skill:assign-to-agent', async (_event, agentId: string, skillId: string) => {
    try {
      db.assignSkillToAgent(agentId, skillId);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] skill:assign-to-agent error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('skill:unassign-from-agent', async (_event, agentId: string, skillId: string) => {
    try {
      db.unassignSkillFromAgent(agentId, skillId);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] skill:unassign-from-agent error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('skill:list-for-agent', async (_event, agentId: string) => {
    try {
      return db.getAgentSkills(agentId);
    } catch (error: any) {
      console.error('[IPC] skill:list-for-agent error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('skill:execute', async () => {
    return { success: true }; // TODO: Implement skill execution logic
  });

  // ===== MCP Handlers =====

  ipcMain.handle('mcp:list-servers', async (_event, workspaceId?: string) => {
    try {
      return db.getMCPServers(workspaceId);
    } catch (error: any) {
      console.error('[IPC] mcp:list-servers error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('mcp:add-server', async (_event, data) => {
    try {
      return db.createMCPServer(data);
    } catch (error: any) {
      console.error('[IPC] mcp:add-server error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('mcp:update-server', async (_event, id: string, data) => {
    try {
      db.updateMCPServer(id, data);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] mcp:update-server error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('mcp:remove-server', async (_event, id: string) => {
    try {
      db.deleteMCPServer(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] mcp:remove-server error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('mcp:toggle-server', async (_event, id: string) => {
    try {
      db.toggleMCPServer(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] mcp:toggle-server error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('mcp:list-tools', async () => {
    return []; // TODO: Implement MCP tools listing
  });

  // ===== Global Skills/MCP Handlers =====

  ipcMain.handle('skill:list-global', async () => {
    try {
      return db.getGlobalSkills();
    } catch (error: any) {
      console.error('[IPC] skill:list-global error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('mcp:list-global', async () => {
    try {
      return db.getGlobalMCPServers();
    } catch (error: any) {
      console.error('[IPC] mcp:list-global error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('mcp:test-server', async (_event, id: string) => {
    try {
      const server = db.getMCPServer(id);
      if (!server) {
        return { success: false, error: 'Server not found' };
      }
      return await mcpTester.testConnection(server);
    } catch (error: any) {
      console.error('[IPC] mcp:test-server error:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== GitHub Handlers =====

  ipcMain.handle('github:set-token', async (_event, token: string) => {
    try {
      db.setSetting('github_pat', token);
      githubService.resetClient();
      console.log('[IPC] GitHub token updated');
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] github:set-token error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('github:has-token', async () => {
    try {
      const token = db.getSetting('github_pat');
      return !!token;
    } catch (error: any) {
      console.error('[IPC] github:has-token error:', error);
      return false;
    }
  });

  ipcMain.handle('github:test-connection', async () => {
    try {
      return await githubService.testConnection();
    } catch (error: any) {
      console.error('[IPC] github:test-connection error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('github:disconnect', async () => {
    try {
      db.deleteSetting('github_pat');
      githubService.resetClient();
      console.log('[IPC] GitHub disconnected');
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] github:disconnect error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('github:clone-repo', async (_event, repoUrl: string, targetPath: string) => {
    try {
      return await githubService.cloneRepo(repoUrl, targetPath);
    } catch (error: any) {
      console.error('[IPC] github:clone-repo error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('github:create-pr', async (_event, options: githubService.PROptions) => {
    try {
      return await githubService.createPR(options);
    } catch (error: any) {
      console.error('[IPC] github:create-pr error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('github:list-repos', async () => {
    try {
      return await githubService.listRepos();
    } catch (error: any) {
      console.error('[IPC] github:list-repos error:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== Git (local) Handlers =====
  ipcMain.handle('git:status', async (_event, repoPath: string) => {
    try {
      return await githubService2.gitStatus(repoPath);
    } catch (error: any) {
      console.error('[IPC] git:status error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:commit', async (_event, repoPath: string, message: string) => {
    try {
      return await githubService2.gitCommit(repoPath, message);
    } catch (error: any) {
      console.error('[IPC] git:commit error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:push', async (_event, repoPath: string) => {
    try {
      return await githubService2.gitPush(repoPath);
    } catch (error: any) {
      console.error('[IPC] git:push error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:commit-and-push', async (_event, repoPath: string, message: string) => {
    try {
      return await githubService2.gitCommitAndPush(repoPath, message);
    } catch (error: any) {
      console.error('[IPC] git:commit-and-push error:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== Hook Handlers =====

  ipcMain.handle('hook:list', async (_event, workspaceId: string) => {
    try {
      return db.getHooks(workspaceId);
    } catch (error: any) {
      console.error('[IPC] hook:list error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('hook:create', async (_event, data) => {
    try {
      return db.createHook(data);
    } catch (error: any) {
      console.error('[IPC] hook:create error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('hook:update', async (_event, id: string, data) => {
    try {
      db.updateHook(id, data);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] hook:update error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('hook:delete', async (_event, id: string) => {
    try {
      db.deleteHook(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] hook:delete error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('hook:toggle', async (_event, id: string) => {
    try {
      db.toggleHook(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] hook:toggle error:', error);
      throw new Error(error.message);
    }
  });

  // ===== Task Handlers (stubs for now) =====

  ipcMain.handle('task:list', async (_event, filters?: {
    workspaceId?: string;
    chatId?: string;
    status?: string;
    assignedToAgentId?: string;
    createdByAgentId?: string;
  }) => {
    try {
      const database = db.getDatabase();
      let query = `
        SELECT
          t.*,
          a1.name as assigned_agent_name,
          a1.avatar as assigned_agent_avatar,
          a2.name as creator_agent_name,
          a2.avatar as creator_agent_avatar
        FROM tasks t
        LEFT JOIN agents a1 ON t.assigned_to_agent_id = a1.id
        LEFT JOIN agents a2 ON t.agent_id = a2.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.workspaceId) {
        query += ' AND t.workspace_id = ?';
        params.push(filters.workspaceId);
      }

      if (filters?.chatId) {
        query += ' AND t.chat_id = ?';
        params.push(filters.chatId);
      }

      if (filters?.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
      }

      if (filters?.assignedToAgentId) {
        query += ' AND t.assigned_to_agent_id = ?';
        params.push(filters.assignedToAgentId);
      }

      if (filters?.createdByAgentId) {
        query += ' AND t.agent_id = ?';
        params.push(filters.createdByAgentId);
      }

      query += ' ORDER BY t.created_at DESC';

      const stmt = database.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      console.error('Failed to list tasks:', error);
      return [];
    }
  });

  ipcMain.handle('task:create', async (_event, data: {
    workspace_id: string;
    agent_id?: string;
    assigned_to_agent_id?: string;
    chat_id?: string;
    title: string;
    description?: string;
  }) => {
    try {
      const database = db.getDatabase();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const stmt = database.prepare(`
        INSERT INTO tasks (id, workspace_id, agent_id, assigned_to_agent_id, chat_id, title, description, status, progress, created_at, last_activity)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', 0, ?, ?)
      `);

      stmt.run(
        id,
        data.workspace_id,
        data.agent_id || null,
        data.assigned_to_agent_id || null,
        data.chat_id || null,
        data.title,
        data.description || null,
        now,
        now
      );

      // Retrieve the created task with agent names
      const task = database.prepare(`
        SELECT
          t.*,
          a1.name as assigned_agent_name,
          a1.avatar as assigned_agent_avatar,
          a2.name as creator_agent_name,
          a2.avatar as creator_agent_avatar
        FROM tasks t
        LEFT JOIN agents a1 ON t.assigned_to_agent_id = a1.id
        LEFT JOIN agents a2 ON t.agent_id = a2.id
        WHERE t.id = ?
      `).get(id);

      // Emit event to renderer for real-time updates
      const mainWindow = BrowserWindow.getAllWindows()[0] || null;
      if (mainWindow) {
        mainWindow.webContents.send('task-update', task);
      }

      return task;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  });

  ipcMain.handle('task:update-status', async (_event, id: string, status: string) => {
    try {
      const database = db.getDatabase();
      const now = new Date().toISOString();

      // Determine completion status
      const completed_at = status === 'complete' || status === 'failed' ? now : null;
      const progress = status === 'complete' ? 100 : status === 'failed' ? 0 : undefined;

      // Set started_at when moving from todo to planning (first active phase)
      const currentTask = database.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
      const started_at = (currentTask?.status === 'todo' && status === 'planning') ? now : undefined;

      let query = 'UPDATE tasks SET status = ?, completed_at = ?, last_activity = ?';
      const params: any[] = [status, completed_at, now];

      if (progress !== undefined) {
        query += ', progress = ?';
        params.push(progress);
      }

      if (started_at !== undefined) {
        query += ', started_at = ?';
        params.push(started_at);
      }

      query += ' WHERE id = ?';
      params.push(id);

      const stmt = database.prepare(query);
      stmt.run(...params);

      // Retrieve the updated task with agent names
      const task = database.prepare(`
        SELECT
          t.*,
          a1.name as assigned_agent_name,
          a1.avatar as assigned_agent_avatar,
          a2.name as creator_agent_name,
          a2.avatar as creator_agent_avatar
        FROM tasks t
        LEFT JOIN agents a1 ON t.assigned_to_agent_id = a1.id
        LEFT JOIN agents a2 ON t.agent_id = a2.id
        WHERE t.id = ?
      `).get(id);

      // Emit event to renderer for real-time updates
      const mainWindow = BrowserWindow.getAllWindows()[0] || null;
      if (mainWindow) {
        mainWindow.webContents.send('task-update', task);
      }

      return task;
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  });

  ipcMain.handle('task:update-progress', async (_event, id: string, progress: number) => {
    try {
      const database = db.getDatabase();

      const stmt = database.prepare('UPDATE tasks SET progress = ? WHERE id = ?');
      stmt.run(Math.min(Math.max(progress, 0), 100), id);

      // Retrieve the updated task
      const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

      // Emit event to renderer for real-time updates
      const mainWindow = BrowserWindow.getAllWindows()[0] || null;
      if (mainWindow) {
        mainWindow.webContents.send('task-update', task);
      }

      return task;
    } catch (error) {
      console.error('Failed to update task progress:', error);
      throw error;
    }
  });

  ipcMain.handle('task:delete', async (_event, id: string) => {
    try {
      const database = db.getDatabase();
      const stmt = database.prepare('DELETE FROM tasks WHERE id = ?');
      stmt.run(id);

      // Emit event to renderer for real-time updates
      const mainWindow = BrowserWindow.getAllWindows()[0] || null;
      if (mainWindow) {
        mainWindow.webContents.send('task-deleted', id);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  });

  ipcMain.handle('task:assign', async (_event, taskId: string, assignedToAgentId: string | null) => {
    try {
      const database = db.getDatabase();
      const now = new Date().toISOString();

      const stmt = database.prepare('UPDATE tasks SET assigned_to_agent_id = ?, last_activity = ? WHERE id = ?');
      stmt.run(assignedToAgentId, now, taskId);

      // Retrieve the updated task with agent names
      const task = database.prepare(`
        SELECT
          t.*,
          a1.name as assigned_agent_name,
          a1.avatar as assigned_agent_avatar,
          a2.name as creator_agent_name,
          a2.avatar as creator_agent_avatar
        FROM tasks t
        LEFT JOIN agents a1 ON t.assigned_to_agent_id = a1.id
        LEFT JOIN agents a2 ON t.agent_id = a2.id
        WHERE t.id = ?
      `).get(taskId);

      // Emit event to renderer for real-time updates
      const mainWindow = BrowserWindow.getAllWindows()[0] || null;
      if (mainWindow) {
        mainWindow.webContents.send('task-update', task);
      }

      return task;
    } catch (error) {
      console.error('Failed to assign task:', error);
      throw error;
    }
  });

  // ===== Attachment Handlers =====

  ipcMain.handle('attachment:list', async (_event, chatId: string) => {
    try {
      const database = db.getDatabase();
      const stmt = database.prepare('SELECT * FROM attachments WHERE chat_id = ? ORDER BY created_at DESC');
      return stmt.all(chatId);
    } catch (error) {
      console.error('Failed to list attachments:', error);
      return [];
    }
  });

  ipcMain.handle('attachment:add', async (_event, data: { chat_id: string; name: string; path: string; mime_type?: string; size?: number; type: string }) => {
    try {
      const database = db.getDatabase();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const stmt = database.prepare(`
        INSERT INTO attachments (id, chat_id, name, path, mime_type, size, type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, data.chat_id, data.name, data.path, data.mime_type || null, data.size || null, data.type, now);

      const attachment = database.prepare('SELECT * FROM attachments WHERE id = ?').get(id);
      return attachment;
    } catch (error) {
      console.error('Failed to add attachment:', error);
      throw error;
    }
  });

  ipcMain.handle('attachment:remove', async (_event, id: string) => {
    try {
      const database = db.getDatabase();
      const stmt = database.prepare('DELETE FROM attachments WHERE id = ?');
      stmt.run(id);
      return { success: true };
    } catch (error) {
      console.error('Failed to remove attachment:', error);
      throw error;
    }
  });

  // ===== File Handlers =====

  ipcMain.handle('files:browse-directory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      console.error('Failed to browse directory:', error);
      throw error;
    }
  });

  ipcMain.handle('files:list-directory', async (_event, dirPath: string) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dirPath, entry.name);
          let size: number | undefined;
          let modified: string | undefined;

          try {
            const stats = await fs.stat(fullPath);
            size = stats.size;
            modified = stats.mtime.toISOString();
          } catch (e) {
            // Ignore stat errors
          }

          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size,
            modified,
          };
        })
      );

      return files;
    } catch (error) {
      console.error('Failed to list directory:', error);
      throw error;
    }
  });

  ipcMain.handle('files:read-file', async (_event, filePath: string) => {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  });

  ipcMain.handle('files:write-file', async (_event, filePath: string, content: string) => {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      console.error('Failed to write file:', error);
      throw error;
    }
  });

  // ===== Rules Handlers =====

  ipcMain.handle('rules:list', async (_event, chatId: string) => {
    try {
      const database = db.getDatabase();
      const stmt = database.prepare('SELECT * FROM session_rules WHERE chat_id = ? ORDER BY created_at DESC');
      return stmt.all(chatId);
    } catch (error) {
      console.error('Failed to list rules:', error);
      return [];
    }
  });

  ipcMain.handle('rules:set', async (_event, data: { chat_id: string; category: string; action: string; pattern?: string }) => {
    try {
      const database = db.getDatabase();

      // First, remove any existing rule for this category in this chat
      const deleteStmt = database.prepare('DELETE FROM session_rules WHERE chat_id = ? AND category = ?');
      deleteStmt.run(data.chat_id, data.category);

      // Insert the new rule
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const insertStmt = database.prepare(`
        INSERT INTO session_rules (id, chat_id, category, pattern, action, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(id, data.chat_id, data.category, data.pattern || null, data.action, now);

      const rule = database.prepare('SELECT * FROM session_rules WHERE id = ?').get(id);
      return rule;
    } catch (error) {
      console.error('Failed to set rule:', error);
      throw error;
    }
  });

  ipcMain.handle('rules:remove', async (_event, id: string) => {
    try {
      const database = db.getDatabase();
      const stmt = database.prepare('DELETE FROM session_rules WHERE id = ?');
      stmt.run(id);
      return { success: true };
    } catch (error) {
      console.error('Failed to remove rule:', error);
      throw error;
    }
  });

  // ===== Approval Handlers =====

  ipcMain.handle('approval:list', async (_event, chatId: string) => {
    try {
      const database = db.getDatabase();
      const stmt = database.prepare('SELECT * FROM approval_requests WHERE chat_id = ? AND status = ? ORDER BY created_at DESC');
      return stmt.all(chatId, 'pending');
    } catch (error) {
      console.error('Failed to list approval requests:', error);
      return [];
    }
  });

  ipcMain.handle('approval:respond', async (_event, data: { id: string; approved: boolean; remember?: boolean; pattern?: string }) => {
    try {
      const database = db.getDatabase();
      const status = data.approved ? 'approved' : 'denied';

      const stmt = database.prepare('UPDATE approval_requests SET status = ? WHERE id = ?');
      stmt.run(status, data.id);

      const request = database.prepare('SELECT * FROM approval_requests WHERE id = ?').get(data.id);

      // Emit event to main process for handling (PermissionService is listening for this)
      const mainWindow = BrowserWindow.getAllWindows()[0] || null;
      if (mainWindow) {
        mainWindow.webContents.send('approval-response', {
          id: data.id,
          approved: data.approved,
          remember: data.remember,
          pattern: data.pattern,
          request,
        });
      }

      return request;
    } catch (error) {
      console.error('Failed to respond to approval request:', error);
      throw error;
    }
  });

  // ===== Settings Handlers =====

  ipcMain.handle('settings:get', async (_event, key: string) => {
    try {
      return db.getSetting(key);
    } catch (error: any) {
      console.error('[IPC] settings:get error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
    try {
      db.setSetting(key, value);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] settings:set error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('settings:get-all', async () => {
    try {
      return db.getAllSettings();
    } catch (error: any) {
      console.error('[IPC] settings:get-all error:', error);
      throw new Error(error.message);
    }
  });

  // ===== Claude API Handlers =====

  ipcMain.handle('claude:set-api-key', async (_event, apiKey: string) => {
    try {
      db.setSetting('anthropic_api_key', apiKey);
      claudeService.resetClient();
      console.log('[IPC] API key updated');
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] claude:set-api-key error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('claude:has-api-key', async () => {
    try {
      const apiKey = db.getSetting('anthropic_api_key');
      return !!apiKey;
    } catch (error: any) {
      console.error('[IPC] claude:has-api-key error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('claude:test-connection', async () => {
    try {
      const result = await claudeService.testConnection();
      return { success: result };
    } catch (error: any) {
      console.error('[IPC] claude:test-connection error:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== System Handlers =====

  ipcMain.handle('system:open-external', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] system:open-external error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('system:select-folder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Folder to Import',
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error: any) {
      console.error('[IPC] system:select-folder error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('system:get-app-path', async () => {
    try {
      return app.getPath('userData');
    } catch (error: any) {
      console.error('[IPC] system:get-app-path error:', error);
      throw new Error(error.message);
    }
  });

  // ===== Window Handlers =====

  ipcMain.handle('window:minimize', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        win.minimize();
      }
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] window:minimize error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('window:maximize', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
      }
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] window:maximize error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('window:toggle-maximize', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
      }
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] window:toggle-maximize error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('window:close', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        win.close();
      }
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] window:close error:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== Terminal Handlers =====

  ipcMain.handle('terminal:create', async (_event, workspacePath?: string) => {
    try {
      return terminalService.createTerminal(workspacePath);
    } catch (error: any) {
      console.error('[IPC] terminal:create error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('terminal:write', async (_event, id: string, data: string) => {
    try {
      terminalService.writeToTerminal(id, data);
    } catch (error: any) {
      console.error('[IPC] terminal:write error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('terminal:resize', async (_event, id: string, cols: number, rows: number) => {
    try {
      terminalService.resizeTerminal(id, cols, rows);
    } catch (error: any) {
      console.error('[IPC] terminal:resize error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('terminal:kill', async (_event, id: string) => {
    try {
      terminalService.killTerminal(id);
    } catch (error: any) {
      console.error('[IPC] terminal:kill error:', error);
      throw new Error(error.message);
    }
  });

  // ===== Permission Mode Handlers =====

  ipcMain.handle('permission:set-workspace-mode', async (_event, workspaceId: string, mode: string) => {
    try {
      db.updateWorkspacePermissionMode(workspaceId, mode);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] permission:set-workspace-mode error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('permission:set-agent-mode', async (_event, agentId: string, mode: string | null) => {
    try {
      db.updateAgentPermissionMode(agentId, mode);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] permission:set-agent-mode error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('permission:list-memory', async (_event, workspaceId: string, agentId?: string) => {
    try {
      return db.getPermissionMemory(workspaceId, agentId);
    } catch (error: any) {
      console.error('[IPC] permission:list-memory error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('permission:delete-memory', async (_event, id: string) => {
    try {
      db.deletePermissionMemory(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] permission:delete-memory error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('permission:clear-memory', async (_event, workspaceId: string, agentId?: string) => {
    try {
      db.clearPermissionMemory(workspaceId, agentId);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] permission:clear-memory error:', error);
      throw new Error(error.message);
    }
  });

  // ===== Category Handlers =====

  ipcMain.handle('category:list', async (_event, type: 'agent' | 'skill' | 'mcp', workspaceId?: string | null) => {
    try {
      const database = db.getDatabase();
      const table = type === 'agent' ? 'agents' : type === 'skill' ? 'skills' : 'mcp_servers';

      let whereClause = '';
      let params: any[] = [];

      if (workspaceId === null) {
        // Global items only
        whereClause = 'WHERE workspace_id IS NULL';
      } else if (workspaceId) {
        // Specific workspace only
        whereClause = 'WHERE workspace_id = ?';
        params.push(workspaceId);
      }
      // If workspaceId is undefined, get all categories (no WHERE clause)

      const stmt = database.prepare(`
        SELECT DISTINCT category FROM ${table}
        ${whereClause}
        ORDER BY category
      `);

      const categories = stmt.all(...params) as Array<{ category: string | null }>;
      return categories.map(c => c.category).filter(Boolean);
    } catch (error: any) {
      console.error('[IPC] category:list error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('category:rename', async (_event, type: 'agent' | 'skill' | 'mcp', oldName: string, newName: string, workspaceId?: string | null) => {
    try {
      const database = db.getDatabase();
      const table = type === 'agent' ? 'agents' : type === 'skill' ? 'skills' : 'mcp_servers';

      let whereClause = 'AND category = ?';
      let params: any[] = [newName, oldName];

      if (workspaceId === null) {
        // Global items only
        whereClause += ' AND workspace_id IS NULL';
      } else if (workspaceId) {
        // Specific workspace only
        whereClause += ' AND workspace_id = ?';
        params.push(workspaceId);
      }

      const stmt = database.prepare(`
        UPDATE ${table}
        SET category = ?
        WHERE category = ? ${whereClause}
      `);

      stmt.run(...params);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] category:rename error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('category:delete', async (_event, type: 'agent' | 'skill' | 'mcp', categoryName: string, workspaceId?: string | null) => {
    try {
      const database = db.getDatabase();
      const table = type === 'agent' ? 'agents' : type === 'skill' ? 'skills' : 'mcp_servers';

      let whereClause = 'WHERE category = ?';
      let params: any[] = [categoryName];

      if (workspaceId === null) {
        // Global items only
        whereClause += ' AND workspace_id IS NULL';
      } else if (workspaceId) {
        // Specific workspace only
        whereClause += ' AND workspace_id = ?';
        params.push(workspaceId);
      }

      // Set category to NULL (moves to "Uncategorized")
      const stmt = database.prepare(`
        UPDATE ${table}
        SET category = NULL
        ${whereClause}
      `);

      stmt.run(...params);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] category:delete error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('category:merge', async (_event, type: 'agent' | 'skill' | 'mcp', sourceCategories: string[], targetCategory: string, workspaceId?: string | null) => {
    try {
      const database = db.getDatabase();
      const table = type === 'agent' ? 'agents' : type === 'skill' ? 'skills' : 'mcp_servers';

      let whereClause = '';
      let params: any[] = [targetCategory];

      if (workspaceId === null) {
        // Global items only
        whereClause = 'AND workspace_id IS NULL';
      } else if (workspaceId) {
        // Specific workspace only
        whereClause = 'AND workspace_id = ?';
        params.push(workspaceId);
      }

      // Build IN clause for source categories
      const placeholders = sourceCategories.map(() => '?').join(', ');
      params.push(...sourceCategories);

      const stmt = database.prepare(`
        UPDATE ${table}
        SET category = ?
        WHERE category IN (${placeholders}) ${whereClause}
      `);

      stmt.run(...params);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] category:merge error:', error);
      throw new Error(error.message);
    }
  });

  // ===== Chat Status Workflow Handlers =====

  ipcMain.handle('chat:update-status', async (_event, chatId: string, status: string) => {
    try {
      db.updateChatStatus(chatId, status);

      // Emit event to renderer for real-time updates
      const mainWindow = BrowserWindow.getAllWindows()[0] || null;
      if (mainWindow) {
        const chat = db.getChat(chatId);
        mainWindow.webContents.send('chat-updated', chat);
      }

      return { success: true };
    } catch (error: any) {
      console.error('[IPC] chat:update-status error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('chat:toggle-flag', async (_event, chatId: string) => {
    try {
      db.toggleChatFlag(chatId);

      // Emit event to renderer for real-time updates
      const mainWindow = BrowserWindow.getAllWindows()[0] || null;
      if (mainWindow) {
        const chat = db.getChat(chatId);
        mainWindow.webContents.send('chat-updated', chat);
      }

      return { success: true };
    } catch (error: any) {
      console.error('[IPC] chat:toggle-flag error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('chat:get-by-status', async (_event, workspaceId: string, status: string) => {
    try {
      return db.getChatsByStatus(workspaceId, status);
    } catch (error: any) {
      console.error('[IPC] chat:get-by-status error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('chat:get-flagged', async (_event, workspaceId: string) => {
    try {
      return db.getFlaggedChats(workspaceId);
    } catch (error: any) {
      console.error('[IPC] chat:get-flagged error:', error);
      throw new Error(error.message);
    }
  });

  // ===== File Operations Handlers =====

  ipcMain.handle('files:readFile', async (_event, filePath: string) => {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error: any) {
      console.error('[IPC] files:readFile error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('files:writeFile', async (_event, filePath: string, content: string) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] files:writeFile error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('files:getFileTree', async (_event, rootPath: string) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      interface FileNode {
        name: string;
        path: string;
        type: 'file' | 'directory';
        children?: FileNode[];
      }

      async function buildTree(dirPath: string): Promise<FileNode> {
        const stats = await fs.stat(dirPath);
        const name = path.basename(dirPath);

        if (stats.isDirectory()) {
          const entries = await fs.readdir(dirPath);

          // Filter out common ignored directories/files
          const filtered = entries.filter(entry =>
            !entry.startsWith('.') &&
            entry !== 'node_modules' &&
            entry !== 'dist' &&
            entry !== 'dist-electron' &&
            entry !== 'build' &&
            entry !== '__pycache__'
          );

          const children = await Promise.all(
            filtered.map(entry => buildTree(path.join(dirPath, entry)))
          );

          return {
            name,
            path: dirPath,
            type: 'directory',
            children: children.sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'directory' ? -1 : 1;
            })
          };
        }

        return {
          name,
          path: dirPath,
          type: 'file'
        };
      }

      return await buildTree(rootPath);
    } catch (error: any) {
      console.error('[IPC] files:getFileTree error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('files:exists', async (_event, filePath: string) => {
    try {
      const fs = await import('fs/promises');
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('files:createFile', async (_event, filePath: string, content: string = '') => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Create file
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true, path: filePath };
    } catch (error: any) {
      console.error('[IPC] files:createFile error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('files:deleteFile', async (_event, filePath: string) => {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] files:deleteFile error:', error);
      throw new Error(error.message);
    }
  });

  // Read image file as base64 data URL
  ipcMain.handle('file:readImageAsBase64', async (_event, filePath: string) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const imageBuffer = await fs.readFile(filePath);
      const base64 = imageBuffer.toString('base64');
      const ext = path.extname(filePath).toLowerCase();

      // Determine MIME type
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      };

      const mimeType = mimeTypes[ext] || 'image/png';
      return `data:${mimeType};base64,${base64}`;
    } catch (error: any) {
      console.error('[IPC] file:readImageAsBase64 error:', error);
      throw new Error(`Failed to read image: ${error.message}`);
    }
  });

  // Open file in default external application
  ipcMain.handle('file:openExternal', async (_event, filePath: string) => {
    try {
      const { shell } = await import('electron');
      await shell.openPath(filePath);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] file:openExternal error:', error);
      throw new Error(`Failed to open file: ${error.message}`);
    }
  });

  // ===== Personal Task Handlers =====

  ipcMain.handle('personal-task:list', async (_event, filters?: { status?: string; workspace_id?: string; priority?: string }) => {
    try {
      return db.getAllPersonalTasks(filters);
    } catch (error: any) {
      console.error('[IPC] personal-task:list error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('personal-task:create', async (_event, data: any) => {
    try {
      const task = db.createPersonalTask(data);
      // Broadcast to all windows
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('personal-task-created', task);
      });
      return task;
    } catch (error: any) {
      console.error('[IPC] personal-task:create error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('personal-task:update', async (_event, id: string, updates: any) => {
    try {
      const task = db.updatePersonalTask(id, updates);
      // Broadcast to all windows
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('personal-task-updated', task);
      });
      return task;
    } catch (error: any) {
      console.error('[IPC] personal-task:update error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('personal-task:update-status', async (_event, id: string, status: string, agentId?: string) => {
    try {
      const task = db.updatePersonalTaskStatus(id, status as any, agentId);
      // Broadcast to all windows
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('personal-task-updated', task);
      });
      return task;
    } catch (error: any) {
      console.error('[IPC] personal-task:update-status error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('personal-task:delete', async (_event, id: string) => {
    try {
      db.deletePersonalTask(id);
      // Broadcast to all windows
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send('personal-task-deleted', id);
      });
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] personal-task:delete error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('personal-task:stats', async () => {
    try {
      return db.getPersonalTaskStats();
    } catch (error: any) {
      console.error('[IPC] personal-task:stats error:', error);
      throw new Error(error.message);
    }
  });

  // ===== Canvas Handlers =====

  ipcMain.handle('canvas:save', async (_event, canvas: {
    id: string;
    workspace_id: string | null;
    name: string;
    data: string;
    thumbnail: string | null;
  }) => {
    try {
      const { id, workspace_id, name, data, thumbnail } = canvas;
      return db.canvasSave(id, workspace_id, name, data, thumbnail);
    } catch (error: any) {
      console.error('[IPC] canvas:save error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('canvas:list', async (_event, workspaceId: string | null) => {
    try {
      return db.canvasList(workspaceId);
    } catch (error: any) {
      console.error('[IPC] canvas:list error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('canvas:get', async (_event, canvasId: string) => {
    try {
      return db.canvasGet(canvasId);
    } catch (error: any) {
      console.error('[IPC] canvas:get error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('canvas:delete', async (_event, canvasId: string) => {
    try {
      return db.canvasDelete(canvasId);
    } catch (error: any) {
      console.error('[IPC] canvas:delete error:', error);
      throw new Error(error.message);
    }
  });

  // ===== Auto-Update Handlers =====

  ipcMain.handle('updater:check-for-updates', async () => {
    try {
      console.log('[IPC] Checking for updates...');
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo };
    } catch (error: any) {
      console.error('[IPC] updater:check-for-updates error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('updater:download-update', async () => {
    try {
      console.log('[IPC] Downloading update...');
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] updater:download-update error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('updater:quit-and-install', async () => {
    try {
      console.log('[IPC] Quitting and installing update...');
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] updater:quit-and-install error:', error);
      return { success: false, error: error.message };
    }
  });

  // ===== Scheduler Handlers =====

  ipcMain.handle('schedule:list', async () => {
    try {
      return schedulerService.listScheduledTasks();
    } catch (error: any) {
      console.error('[IPC] schedule:list error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('schedule:create', async (_event, data: {
    name: string;
    description?: string;
    cron_expression: string;
    command: string;
    working_directory?: string;
    enabled?: number;
  }) => {
    try {
      return schedulerService.createScheduledTask({
        name: data.name,
        description: data.description,
        cron_expression: data.cron_expression,
        command: data.command,
        working_directory: data.working_directory,
        enabled: data.enabled ?? 1,
      });
    } catch (error: any) {
      console.error('[IPC] schedule:create error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('schedule:update', async (_event, id: string, data: any) => {
    try {
      return schedulerService.updateScheduledTask(id, data);
    } catch (error: any) {
      console.error('[IPC] schedule:update error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('schedule:delete', async (_event, id: string) => {
    try {
      schedulerService.deleteScheduledTask(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] schedule:delete error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('schedule:toggle', async (_event, id: string) => {
    try {
      return schedulerService.toggleScheduledTask(id);
    } catch (error: any) {
      console.error('[IPC] schedule:toggle error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('schedule:run-now', async (_event, id: string) => {
    try {
      return await schedulerService.runTaskNow(id);
    } catch (error: any) {
      console.error('[IPC] schedule:run-now error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('schedule:history', async (_event, taskId: string, limit?: number) => {
    try {
      return schedulerService.getTaskHistory(taskId, limit || 50);
    } catch (error: any) {
      console.error('[IPC] schedule:history error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('schedule:validate-cron', async (_event, expression: string) => {
    try {
      return schedulerService.validateCronExpression(expression);
    } catch (error: any) {
      console.error('[IPC] schedule:validate-cron error:', error);
      return { valid: false, error: error.message };
    }
  });

  // ===== Telegram Handlers =====

  ipcMain.handle('telegram:set-token', async (_event, token: string) => {
    try {
      telegramService.setBotToken(token);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] telegram:set-token error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('telegram:get-token', async () => {
    try {
      return telegramService.getBotTokenMasked();
    } catch (error: any) {
      console.error('[IPC] telegram:get-token error:', error);
      return null;
    }
  });

  ipcMain.handle('telegram:test-connection', async (_event, token?: string) => {
    try {
      return await telegramService.testBotConnection(token);
    } catch (error: any) {
      console.error('[IPC] telegram:test-connection error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('telegram:start-bot', async () => {
    try {
      return await telegramService.startBot();
    } catch (error: any) {
      console.error('[IPC] telegram:start-bot error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('telegram:stop-bot', async () => {
    try {
      return await telegramService.stopBot();
    } catch (error: any) {
      console.error('[IPC] telegram:stop-bot error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('telegram:get-status', async () => {
    try {
      return telegramService.getStatus();
    } catch (error: any) {
      console.error('[IPC] telegram:get-status error:', error);
      return { running: false, token: null };
    }
  });

  ipcMain.handle('telegram:list-links', async () => {
    try {
      return telegramService.listLinks();
    } catch (error: any) {
      console.error('[IPC] telegram:list-links error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('telegram:create-link', async (_event, data: {
    telegram_chat_id: string;
    telegram_username?: string;
    agent_id: string;
    enabled?: number;
  }) => {
    try {
      return telegramService.createLink({
        telegram_chat_id: data.telegram_chat_id,
        telegram_username: data.telegram_username,
        agent_id: data.agent_id,
        enabled: data.enabled ?? 1,
      });
    } catch (error: any) {
      console.error('[IPC] telegram:create-link error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('telegram:delete-link', async (_event, id: string) => {
    try {
      telegramService.deleteLink(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] telegram:delete-link error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('telegram:toggle-link', async (_event, id: string) => {
    try {
      return telegramService.toggleLink(id);
    } catch (error: any) {
      console.error('[IPC] telegram:toggle-link error:', error);
      throw new Error(error.message);
    }
  });

  // ===== Knowledge Store Handlers =====

  ipcMain.handle('knowledge:list', async (_event, workspaceId: string, filters?: {
    category?: string;
    agent_id?: string;
    limit?: number;
  }) => {
    try {
      return db.getKnowledgeEntries(workspaceId, filters);
    } catch (error: any) {
      console.error('[IPC] knowledge:list error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('knowledge:create', async (_event, data: {
    workspace_id: string;
    agent_id?: string;
    category: string;
    title: string;
    content: string;
    source?: string;
    confidence?: number;
    tags?: string;
    expires_at?: string;
  }) => {
    try {
      return db.createKnowledgeEntry(data);
    } catch (error: any) {
      console.error('[IPC] knowledge:create error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('knowledge:delete', async (_event, id: string) => {
    try {
      db.deleteKnowledgeEntry(id);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] knowledge:delete error:', error);
      throw new Error(error.message);
    }
  });

  ipcMain.handle('knowledge:learnings', async (_event, workspaceId: string, agentId?: string) => {
    try {
      return db.getKnowledgeLearnings(workspaceId, agentId);
    } catch (error: any) {
      console.error('[IPC] knowledge:learnings error:', error);
      throw new Error(error.message);
    }
  });

  // ===== Agent Runner Handlers =====

  ipcMain.handle('agent-runner:run', async (_event, agentId: string, workspaceId: string, triggerContext?: string) => {
    try {
      return await agentRunnerService.runAgent(agentId, workspaceId, triggerContext);
    } catch (error: any) {
      console.error('[IPC] agent-runner:run error:', error);
      throw new Error(error.message);
    }
  });

  // ===== Footy Lab Seed Handler =====

  ipcMain.handle('footy-lab:seed-agents', async (_event, workspaceId: string) => {
    try {
      db.seedFootyLabAgents(workspaceId);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] footy-lab:seed-agents error:', error);
      throw new Error(error.message);
    }
  });

  console.log('[IPC] All handlers registered');
}
