import { Bot, Context, GrammyError, HttpError } from 'grammy';
import { BrowserWindow } from 'electron';
import * as db from '../database/db.js';
import * as aiService from './aiService.js';

let bot: Bot | null = null;
let isRunning = false;

/**
 * Get the Telegram bot token from settings
 */
function getBotToken(): string | null {
  return db.getSetting('telegram_bot_token');
}

/**
 * Initialize and start the Telegram bot
 */
export async function startBot(): Promise<{ success: boolean; error?: string }> {
  if (isRunning && bot) {
    return { success: true };
  }

  const token = getBotToken();
  if (!token) {
    return { success: false, error: 'No Telegram bot token configured' };
  }

  try {
    bot = new Bot(token);

    // Command handlers
    bot.command('start', handleStartCommand);
    bot.command('agents', handleAgentsCommand);
    bot.command('switch', handleSwitchCommand);
    bot.command('status', handleStatusCommand);
    bot.command('help', handleHelpCommand);

    // Message handler for regular text messages
    bot.on('message:text', handleTextMessage);

    // Error handler
    bot.catch((err) => {
      const ctx = err.ctx;
      console.error(`[Telegram] Error while handling update ${ctx.update.update_id}:`);

      const e = err.error;
      if (e instanceof GrammyError) {
        console.error('[Telegram] Error in request:', e.description);
      } else if (e instanceof HttpError) {
        console.error('[Telegram] Could not contact Telegram:', e);
      } else {
        console.error('[Telegram] Unknown error:', e);
      }
    });

    // Start the bot
    await bot.start({
      onStart: () => {
        isRunning = true;
        console.log('[Telegram] Bot started successfully');
        notifyRenderer('bot-started', { status: 'running' });
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[Telegram] Failed to start bot:', error);
    bot = null;
    isRunning = false;
    return { success: false, error: error.message };
  }
}

/**
 * Stop the Telegram bot
 */
export async function stopBot(): Promise<{ success: boolean }> {
  if (bot) {
    await bot.stop();
    bot = null;
    isRunning = false;
    console.log('[Telegram] Bot stopped');
    notifyRenderer('bot-stopped', { status: 'stopped' });
  }
  return { success: true };
}

/**
 * Check if the bot is running
 */
export function isBotRunning(): boolean {
  return isRunning;
}

/**
 * Test bot connection with the given token
 */
export async function testBotConnection(token?: string): Promise<{ success: boolean; username?: string; error?: string }> {
  const testToken = token || getBotToken();
  if (!testToken) {
    return { success: false, error: 'No bot token provided' };
  }

  try {
    const testBot = new Bot(testToken);
    const me = await testBot.api.getMe();
    return { success: true, username: me.username };
  } catch (error: any) {
    console.error('[Telegram] Connection test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set the bot token
 */
export function setBotToken(token: string): void {
  db.setSetting('telegram_bot_token', token);

  // If bot is running, restart it with new token
  if (isRunning) {
    stopBot().then(() => startBot());
  }
}

/**
 * Get the bot token (masked for security)
 */
export function getBotTokenMasked(): string | null {
  const token = getBotToken();
  if (!token) return null;

  if (token.length <= 10) {
    return '***';
  }

  return token.substring(0, 5) + '...' + token.substring(token.length - 5);
}

// ===== Command Handlers =====

async function handleStartCommand(ctx: Context): Promise<void> {
  const telegramChatId = ctx.chat?.id.toString();
  const username = ctx.from?.username;

  if (!telegramChatId) return;

  // Check if link already exists
  let link = db.getTelegramAgentLinkByChatId(telegramChatId);

  if (!link) {
    // Get first available agent
    const globalAgents = db.getGlobalAgents();
    const defaultAgent = globalAgents[0] || db.getOrCreateDefaultAgent();

    // Create new link
    link = db.createTelegramAgentLink({
      telegram_chat_id: telegramChatId,
      telegram_username: username,
      agent_id: defaultAgent.id,
      enabled: 1,
    });

    await ctx.reply(
      `Welcome to AgentSpaces! 🤖\n\n` +
      `You're now connected to agent: *${defaultAgent.name}*\n\n` +
      `Commands:\n` +
      `/agents - List available agents\n` +
      `/switch <name> - Switch to a different agent\n` +
      `/status - Show current connection status\n` +
      `/help - Show this help message\n\n` +
      `Just send a message to start chatting!`,
      { parse_mode: 'Markdown' }
    );
  } else {
    const agent = db.getAgent(link.agent_id);
    await ctx.reply(
      `Welcome back! 👋\n\n` +
      `You're connected to agent: *${agent?.name || 'Unknown'}*\n\n` +
      `Send /help for available commands.`,
      { parse_mode: 'Markdown' }
    );
  }

  notifyRenderer('new-connection', { chatId: telegramChatId, username });
}

async function handleAgentsCommand(ctx: Context): Promise<void> {
  const globalAgents = db.getGlobalAgents();
  const defaultAgent = db.getOrCreateDefaultAgent();

  const allAgents = [...globalAgents];
  if (!allAgents.find(a => a.id === defaultAgent.id)) {
    allAgents.push(defaultAgent);
  }

  if (allAgents.length === 0) {
    await ctx.reply('No agents available.');
    return;
  }

  const agentList = allAgents.map(a => `• *${a.name}*${a.description ? ` - ${a.description}` : ''}`).join('\n');

  await ctx.reply(
    `Available agents:\n\n${agentList}\n\n` +
    `Use /switch <agent name> to change agent.`,
    { parse_mode: 'Markdown' }
  );
}

async function handleSwitchCommand(ctx: Context): Promise<void> {
  const telegramChatId = ctx.chat?.id.toString();
  if (!telegramChatId) return;

  const link = db.getTelegramAgentLinkByChatId(telegramChatId);
  if (!link) {
    await ctx.reply('Please use /start first to connect.');
    return;
  }

  const agentName = ctx.message?.text?.replace('/switch', '').trim();
  if (!agentName) {
    await ctx.reply('Please specify an agent name: /switch <agent name>');
    return;
  }

  // Find agent by name (case-insensitive)
  const globalAgents = db.getGlobalAgents();
  const defaultAgent = db.getOrCreateDefaultAgent();

  const allAgents = [...globalAgents];
  if (!allAgents.find(a => a.id === defaultAgent.id)) {
    allAgents.push(defaultAgent);
  }

  const agent = allAgents.find(a => a.name.toLowerCase() === agentName.toLowerCase());

  if (!agent) {
    await ctx.reply(
      `Agent "${agentName}" not found.\n\n` +
      `Use /agents to see available agents.`
    );
    return;
  }

  // Update link to new agent and clear chat_id to start fresh
  db.updateTelegramAgentLink(link.id, {
    agent_id: agent.id,
    chat_id: undefined,
  });

  await ctx.reply(
    `Switched to agent: *${agent.name}*\n\n` +
    `${agent.description || ''}`,
    { parse_mode: 'Markdown' }
  );

  notifyRenderer('agent-switched', { chatId: telegramChatId, agentId: agent.id, agentName: agent.name });
}

async function handleStatusCommand(ctx: Context): Promise<void> {
  const telegramChatId = ctx.chat?.id.toString();
  if (!telegramChatId) return;

  const link = db.getTelegramAgentLinkByChatId(telegramChatId);
  if (!link) {
    await ctx.reply('Not connected. Use /start to begin.');
    return;
  }

  const agent = db.getAgent(link.agent_id);

  await ctx.reply(
    `📊 *Connection Status*\n\n` +
    `Agent: ${agent?.name || 'Unknown'}\n` +
    `Status: ${link.enabled ? '🟢 Active' : '🔴 Disabled'}\n` +
    `Connected since: ${new Date(link.created_at).toLocaleDateString()}`,
    { parse_mode: 'Markdown' }
  );
}

async function handleHelpCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    `*AgentSpaces Telegram Bot*\n\n` +
    `Commands:\n` +
    `/start - Connect to AgentSpaces\n` +
    `/agents - List available agents\n` +
    `/switch <name> - Switch to a different agent\n` +
    `/status - Show connection status\n` +
    `/help - Show this help message\n\n` +
    `Just send a message to chat with your agent!`,
    { parse_mode: 'Markdown' }
  );
}

// ===== Message Handler =====

async function handleTextMessage(ctx: Context): Promise<void> {
  const telegramChatId = ctx.chat?.id.toString();
  const messageText = ctx.message?.text;

  if (!telegramChatId || !messageText) return;

  // Get or create link
  let link = db.getTelegramAgentLinkByChatId(telegramChatId);
  if (!link) {
    await ctx.reply('Please use /start first to connect.');
    return;
  }

  if (!link.enabled) {
    await ctx.reply('This connection is disabled. Contact the administrator.');
    return;
  }

  const agent = db.getAgent(link.agent_id);
  if (!agent) {
    await ctx.reply('Agent not found. Please use /switch to select a different agent.');
    return;
  }

  // Get or create chat for this Telegram conversation
  let chatId = link.chat_id;
  if (!chatId) {
    // Create a new chat for this Telegram user
    const chat = db.createChat({
      workspace_id: agent.workspace_id || '__telegram__',
      agent_id: agent.id,
      title: `Telegram: ${ctx.from?.username || telegramChatId}`,
    });
    chatId = chat.id;

    // Update link with chat_id
    db.updateTelegramAgentLink(link.id, { chat_id: chatId });
  }

  // Save user message
  db.createMessage({
    chat_id: chatId,
    role: 'user',
    content: messageText,
  });

  // Show typing indicator
  await ctx.replyWithChatAction('typing');

  try {
    // Get conversation history
    const messages = db.getMessages(chatId);
    const chatHistory = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Get AI response (non-streaming for Telegram)
    const response = await aiService.streamMessageWithTools(
      chatHistory,
      {
        systemPrompt: agent.system_prompt,
        model: agent.model,
        thinkingEnabled: agent.thinking_enabled === 1,
        toolsEnabled: false, // Disable tools for Telegram for simplicity
        browserMode: false,
      },
      {
        workspaceId: agent.workspace_id || '__telegram__',
        chatId: chatId,
        agentId: agent.id,
        browserMode: false,
      },
      {
        onText: () => {},
        onThinking: () => {},
        onToolUse: () => {},
        onToolResult: () => {},
        onError: (error) => console.error('[Telegram] AI error:', error),
      },
      null // No mainWindow for streaming
    );

    // Save assistant message
    db.createMessage({
      chat_id: chatId,
      role: 'assistant',
      content: response.content,
      thinking_content: response.thinkingContent,
    });

    // Send response to Telegram (split if too long)
    const maxLength = 4096;
    const responseText = response.content || 'I apologize, but I was unable to generate a response.';

    if (responseText.length <= maxLength) {
      await ctx.reply(responseText);
    } else {
      // Split into chunks
      for (let i = 0; i < responseText.length; i += maxLength) {
        await ctx.reply(responseText.substring(i, i + maxLength));
      }
    }

    notifyRenderer('message-received', {
      chatId: telegramChatId,
      message: messageText,
      response: responseText.substring(0, 200),
    });

  } catch (error: any) {
    console.error('[Telegram] Error processing message:', error);
    await ctx.reply('Sorry, I encountered an error processing your message. Please try again.');
  }
}

// ===== Utility Functions =====

function notifyRenderer(event: string, data: any): void {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send('telegram-activity', { event, ...data });
  }
}

/**
 * Get all Telegram agent links
 */
export function listLinks(): db.TelegramAgentLink[] {
  return db.getTelegramAgentLinks();
}

/**
 * Create a new Telegram agent link
 */
export function createLink(data: Omit<db.TelegramAgentLink, 'id' | 'created_at' | 'updated_at'>): db.TelegramAgentLink {
  return db.createTelegramAgentLink(data);
}

/**
 * Delete a Telegram agent link
 */
export function deleteLink(id: string): void {
  db.deleteTelegramAgentLink(id);
}

/**
 * Toggle a Telegram agent link
 */
export function toggleLink(id: string): db.TelegramAgentLink {
  return db.toggleTelegramAgentLink(id);
}

/**
 * Get bot status
 */
export function getStatus(): { running: boolean; token: string | null } {
  return {
    running: isRunning,
    token: getBotTokenMasked(),
  };
}
