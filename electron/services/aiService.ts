/**
 * Unified AI Service - Routes requests to the appropriate AI provider
 * based on the model being used
 */

import { BrowserWindow } from 'electron';
import type { ChatMessage, StreamCallbacks, ExtendedMessage, ToolExecution } from './claudeService.js';
import type { ToolContext } from './toolExecutor.js';
import * as claudeService from './claudeService.js';
import * as openaiService from './openaiService.js';
import * as googleService from './googleService.js';
import * as openrouterService from './openrouterService.js';

/**
 * Determine which provider to use based on the model
 */
function getProvider(model: string): 'anthropic' | 'openai' | 'google' | 'groq' | 'openrouter' {
  if (model.startsWith('claude-')) {
    return 'anthropic';
  } else if (model.startsWith('gpt-') || model.startsWith('o1')) {
    return 'openai';
  } else if (model.startsWith('gemini-')) {
    return 'google';
  } else if (model.startsWith('llama-') || model.startsWith('mixtral-')) {
    return 'groq';
  } else if (model.startsWith('openrouter/')) {
    return 'openrouter';
  }

  // Default to Claude
  return 'anthropic';
}

/**
 * Stream a message using the appropriate provider
 */
export async function streamMessage(
  messages: ChatMessage[],
  options: {
    systemPrompt?: string;
    model?: string;
    thinkingEnabled?: boolean;
    maxTokens?: number;
  },
  callbacks: StreamCallbacks,
  mainWindow: BrowserWindow | null
): Promise<{ content: string; thinkingContent?: string }> {
  const model = options.model || 'claude-sonnet-4.5';
  const provider = getProvider(model);

  console.log('[AI Service] Routing to provider:', provider, 'for model:', model);

  switch (provider) {
    case 'anthropic':
      return claudeService.streamMessage(messages, options, callbacks, mainWindow);

    case 'openai':
      return openaiService.streamMessage(messages, options, callbacks, mainWindow);

    case 'google':
      return googleService.streamMessage(messages, options, callbacks, mainWindow);

    case 'groq':
      // Groq uses OpenAI-compatible API, route to openaiService for now
      // TODO: Create dedicated groqService with Groq endpoint
      throw new Error('Groq models not yet supported. Coming soon!');

    case 'openrouter':
      return openrouterService.streamMessage(messages, options, callbacks, mainWindow);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Stream a message with tool support using the appropriate provider
 */
export async function streamMessageWithTools(
  messages: ExtendedMessage[],
  options: {
    systemPrompt?: string;
    model?: string;
    thinkingEnabled?: boolean;
    maxTokens?: number;
    toolsEnabled?: boolean;
    browserMode?: boolean;
  },
  toolContext: ToolContext,
  callbacks: StreamCallbacks,
  mainWindow: BrowserWindow | null
): Promise<{ content: string; thinkingContent?: string; toolExecutions: ToolExecution[] }> {
  const model = options.model || 'claude-sonnet-4.5';
  const provider = getProvider(model);

  console.log('[AI Service] Routing to provider:', provider, 'for model:', model, 'with tools');

  switch (provider) {
    case 'anthropic':
      return claudeService.streamMessageWithTools(messages, options, toolContext, callbacks, mainWindow);

    case 'openai':
      return openaiService.streamMessageWithTools(messages, options, toolContext, callbacks, mainWindow);

    case 'google':
      return googleService.streamMessageWithTools(messages, options, toolContext, callbacks, mainWindow);

    case 'groq':
      throw new Error('Groq models not yet supported. Coming soon!');

    case 'openrouter':
      return openrouterService.streamMessageWithTools(messages, options, toolContext, callbacks, mainWindow);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Send a simple non-streaming message using the appropriate provider
 */
export async function sendMessage(
  messages: ChatMessage[],
  options: {
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
  }
): Promise<string> {
  const model = options.model || 'claude-sonnet-4.5';
  const provider = getProvider(model);

  console.log('[AI Service] Sending simple message to provider:', provider, 'for model:', model);

  switch (provider) {
    case 'anthropic':
      return claudeService.sendMessage(messages, options);

    case 'openai':
    case 'google':
    case 'groq':
    case 'openrouter':
      // For now, only Anthropic supports sendMessage
      // For others, we'd need to implement non-streaming versions
      throw new Error(`Simple message sending not yet supported for ${provider}`);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Test connection for a specific provider
 */
export async function testConnection(provider: 'anthropic' | 'openai' | 'google' | 'openrouter'): Promise<boolean> {
  console.log('[AI Service] Testing connection for provider:', provider);

  switch (provider) {
    case 'anthropic':
      return claudeService.testConnection();

    case 'openai':
      return openaiService.testConnection();

    case 'google':
      return googleService.testConnection();

    case 'openrouter':
      return openrouterService.testConnection();

    default:
      return false;
  }
}

/**
 * Reset client for a specific provider (call when API key changes)
 */
export function resetClient(provider: 'anthropic' | 'openai' | 'google' | 'openrouter'): void {
  console.log('[AI Service] Resetting client for provider:', provider);

  switch (provider) {
    case 'anthropic':
      claudeService.resetClient();
      break;

    case 'openai':
      openaiService.resetClient();
      break;

    case 'google':
      googleService.resetClient();
      break;

    case 'openrouter':
      openrouterService.resetClient();
      break;
  }
}

/**
 * Get or initialize client for a specific provider
 */
export function getClient(provider: 'anthropic' | 'openai' | 'google' | 'openrouter'): any {
  switch (provider) {
    case 'anthropic':
      return claudeService.getClient();

    case 'openai':
      return openaiService.getClient();

    case 'google':
      return googleService.getClient();

    case 'openrouter':
      return openrouterService.getClient();

    default:
      return null;
  }
}
