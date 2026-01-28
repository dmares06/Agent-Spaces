import Anthropic from '@anthropic-ai/sdk';
import { BrowserWindow } from 'electron';
import * as db from '../database/db.js';
import { getToolsForAgent } from './toolDefinitions.js';
import { executeToolLocally, ToolContext } from './toolExecutor.js';

let anthropicClient: Anthropic | null = null;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Extended message type for tool use
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface ExtendedMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ToolExecution {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  result: string;
  isError: boolean;
}

export interface StreamCallbacks {
  onText?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onToolUse?: (toolName: string, toolInput: Record<string, unknown>, toolUseId: string) => void;
  onToolResult?: (toolUseId: string, result: string, isError: boolean) => void;
  onComplete?: (fullText: string, thinkingContent?: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Initialize or get the Anthropic client
 */
export function getClient(): Anthropic | null {
  if (anthropicClient) return anthropicClient;

  const apiKey = db.getSetting('anthropic_api_key');
  if (!apiKey) {
    console.log('[Claude] No API key configured');
    return null;
  }

  anthropicClient = new Anthropic({ apiKey });
  console.log('[Claude] Client initialized');
  return anthropicClient;
}

/**
 * Reset the client (call when API key changes)
 */
export function resetClient(): void {
  anthropicClient = null;
  console.log('[Claude] Client reset');
}

/**
 * Map model names to actual Anthropic model IDs
 */
function getModelId(model: string): string {
  const modelMap: Record<string, string> = {
    'claude-sonnet-4.5': 'claude-sonnet-4-5-20250929',
    'claude-opus-4.5': 'claude-opus-4-5-20251101',
    'claude-sonnet-4': 'claude-sonnet-4-20250514',
    'claude-opus-4': 'claude-opus-4-20250514',
    'claude-haiku-3.5': 'claude-3-5-haiku-20241022',
  };
  return modelMap[model] || model;
}

/**
 * Check if a model supports extended thinking
 */
function supportsExtendedThinking(model: string): boolean {
  const thinkingModels = [
    'claude-sonnet-4',
    'claude-opus-4',
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514',
    'claude-sonnet-4-5-20250929',
    'claude-opus-4-5-20251101'
  ];
  return thinkingModels.some(m => model.includes(m));
}

/**
 * Send a message to Claude and stream the response
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
  const client = getClient();
  if (!client) {
    const error = new Error('Anthropic API key not configured. Please set your API key in Settings.');
    callbacks.onError?.(error);
    throw error;
  }

  const model = getModelId(options.model || 'claude-sonnet-4.5');
  const useThinking = options.thinkingEnabled && supportsExtendedThinking(model);

  console.log('[Claude] Streaming message with model:', model, 'thinking:', useThinking);

  let fullText = '';
  let thinkingContent = '';

  try {
    // Build the request parameters
    const requestParams: Record<string, any> = {
      model,
      max_tokens: useThinking ? 16000 : (options.maxTokens || 4096),
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    // Add system prompt if provided
    if (options.systemPrompt) {
      requestParams.system = options.systemPrompt;
    }

    // Add thinking configuration for supported models
    if (useThinking) {
      requestParams.thinking = {
        type: 'enabled',
        budget_tokens: 10000,
      };
    }

    // Create streaming message
    const stream = await client.messages.stream(requestParams as Anthropic.MessageCreateParams);

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta as any;

        if (delta.type === 'thinking_delta' && delta.thinking) {
          thinkingContent += delta.thinking;
          callbacks.onThinking?.(delta.thinking);

          // Send thinking chunk to renderer
          mainWindow?.webContents.send('message-chunk', {
            type: 'thinking',
            content: delta.thinking,
          });
        } else if (delta.type === 'text_delta' && delta.text) {
          fullText += delta.text;
          callbacks.onText?.(delta.text);

          // Send text chunk to renderer
          mainWindow?.webContents.send('message-chunk', {
            type: 'text',
            content: delta.text,
          });
        }
      }
    }

    // Signal completion
    mainWindow?.webContents.send('message-chunk', {
      type: 'complete',
      content: fullText,
      thinkingContent: thinkingContent || undefined,
    });

    callbacks.onComplete?.(fullText, thinkingContent || undefined);

    return { content: fullText, thinkingContent: thinkingContent || undefined };
  } catch (error: any) {
    console.error('[Claude] Stream error:', error);

    // Send error to renderer
    mainWindow?.webContents.send('message-chunk', {
      type: 'error',
      error: error.message,
    });

    callbacks.onError?.(error);
    throw error;
  }
}

/**
 * Send a message to Claude with tool use support and stream the response
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
  const client = getClient();
  if (!client) {
    const error = new Error('Anthropic API key not configured. Please set your API key in Settings.');
    callbacks.onError?.(error);
    throw error;
  }

  const model = getModelId(options.model || 'claude-sonnet-4.5');
  const useThinking = options.thinkingEnabled && supportsExtendedThinking(model);
  const useTools = options.toolsEnabled !== false; // Default to true

  console.log('[Claude] Streaming message with tools, model:', model, 'thinking:', useThinking, 'tools:', useTools);

  let fullText = '';
  let thinkingContent = '';
  const toolExecutions: ToolExecution[] = [];
  let conversationMessages = [...messages];

  // Tool use loop - continue until Claude returns end_turn
  let continueLoop = true;

  try {
    while (continueLoop) {
      const requestParams: Record<string, any> = {
        model,
        max_tokens: useThinking ? 16000 : (options.maxTokens || 4096),
        messages: conversationMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      };

      if (options.systemPrompt) {
        requestParams.system = options.systemPrompt;
      }

      if (useThinking) {
        requestParams.thinking = {
          type: 'enabled',
          budget_tokens: 10000,
        };
      }

      if (useTools) {
        requestParams.tools = getToolsForAgent({
          tasksEnabled: true,
          filesEnabled: true,
          browserMode: options.browserMode || false
        });
      }

      const stream = await client.messages.stream(requestParams as Anthropic.MessageCreateParams);

      let currentToolUse: { id: string; name: string; input: string } | null = null;
      const toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
      let stopReason: string | null = null;
      let iterationText = '';

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const block = event.content_block as any;
          if (block.type === 'tool_use') {
            currentToolUse = { id: block.id, name: block.name, input: '' };
            // Notify UI that tool use is starting
            mainWindow?.webContents.send('message-chunk', {
              type: 'tool_use_start',
              toolUseId: block.id,
              toolName: block.name,
            });
          }
        } else if (event.type === 'content_block_delta') {
          const delta = event.delta as any;

          if (delta.type === 'thinking_delta' && delta.thinking) {
            thinkingContent += delta.thinking;
            callbacks.onThinking?.(delta.thinking);
            mainWindow?.webContents.send('message-chunk', {
              type: 'thinking',
              content: delta.thinking,
            });
          } else if (delta.type === 'text_delta' && delta.text) {
            iterationText += delta.text;
            fullText += delta.text;
            callbacks.onText?.(delta.text);
            mainWindow?.webContents.send('message-chunk', {
              type: 'text',
              content: delta.text,
            });
          } else if (delta.type === 'input_json_delta' && currentToolUse) {
            currentToolUse.input += delta.partial_json;
          }
        } else if (event.type === 'content_block_stop' && currentToolUse) {
          // Parse the complete tool input
          try {
            const parsedInput = JSON.parse(currentToolUse.input || '{}');
            toolUseBlocks.push({
              id: currentToolUse.id,
              name: currentToolUse.name,
              input: parsedInput,
            });
            callbacks.onToolUse?.(currentToolUse.name, parsedInput, currentToolUse.id);
          } catch (e) {
            console.error('[Claude] Failed to parse tool input:', e);
          }
          currentToolUse = null;
        } else if (event.type === 'message_delta') {
          stopReason = (event.delta as any).stop_reason;
        }
      }

      // Check if we need to execute tools
      if (stopReason === 'tool_use' && toolUseBlocks.length > 0) {
        // Build assistant message with tool use blocks
        const assistantContent: ContentBlock[] = [];
        if (iterationText) {
          assistantContent.push({ type: 'text', text: iterationText });
        }
        for (const toolUse of toolUseBlocks) {
          assistantContent.push({
            type: 'tool_use',
            id: toolUse.id,
            name: toolUse.name,
            input: toolUse.input,
          });
        }
        conversationMessages.push({ role: 'assistant', content: assistantContent });

        // Execute tools and collect results
        const toolResults: ContentBlock[] = [];
        for (const toolUse of toolUseBlocks) {
          const result = await executeToolLocally(
            toolUse.name,
            toolUse.input,
            toolContext,
            mainWindow
          );

          toolExecutions.push({
            toolUseId: toolUse.id,
            toolName: toolUse.name,
            input: toolUse.input,
            result: result.content,
            isError: result.isError,
          });

          callbacks.onToolResult?.(toolUse.id, result.content, result.isError);

          // Send tool result to UI
          mainWindow?.webContents.send('message-chunk', {
            type: 'tool_result',
            toolUseId: toolUse.id,
            toolName: toolUse.name,
            result: result.content,
            isError: result.isError,
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result.content,
            is_error: result.isError,
          });
        }

        // Add tool results as user message
        conversationMessages.push({ role: 'user', content: toolResults });
      } else {
        // No more tools to execute, exit loop
        continueLoop = false;
      }
    }

    // Signal completion
    mainWindow?.webContents.send('message-chunk', {
      type: 'complete',
      content: fullText,
      thinkingContent: thinkingContent || undefined,
      toolExecutions,
    });

    callbacks.onComplete?.(fullText, thinkingContent || undefined);

    return { content: fullText, thinkingContent: thinkingContent || undefined, toolExecutions };
  } catch (error: any) {
    console.error('[Claude] Stream error:', error);

    mainWindow?.webContents.send('message-chunk', {
      type: 'error',
      error: error.message,
    });

    callbacks.onError?.(error);
    throw error;
  }
}

/**
 * Send a simple non-streaming message to Claude
 */
export async function sendMessage(
  messages: ChatMessage[],
  options: {
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
  }
): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error('Anthropic API key not configured');
  }

  const model = getModelId(options.model || 'claude-sonnet-4.5');

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens || 4096,
    system: options.systemPrompt,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}

/**
 * Send a simple message and get a response (uses Haiku for speed)
 */
export async function sendSimpleMessage(prompt: string): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error('Anthropic API key not configured');
  }

  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}

/**
 * Test the API connection
 */
export async function testConnection(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });
    return true;
  } catch (error) {
    console.error('[Claude] Connection test failed:', error);
    return false;
  }
}

export interface GeneratedAgentConfig {
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  thinking_enabled: boolean;
}

/**
 * Generate agent configuration from a natural language description
 */
export async function generateAgentConfig(description: string): Promise<GeneratedAgentConfig> {
  const client = getClient();
  if (!client) {
    throw new Error('Anthropic API key not configured. Please set your API key in Settings.');
  }

  const systemPrompt = `You are an AI agent configuration generator. Given a description of what the user wants, generate a complete agent configuration.

You must return a valid JSON object with exactly these fields:
- name: A short, descriptive name for the agent (2-4 words)
- description: One sentence describing the agent's purpose
- system_prompt: Detailed instructions for the agent (be specific and helpful, include relevant context about what the agent should do, how it should behave, and any constraints)
- model: One of "claude-sonnet-4.5", "claude-opus-4.5", or "claude-haiku-3.5"
- thinking_enabled: true if the task requires deep reasoning, false for quick tasks

Guidelines for choosing the model:
- Use "claude-haiku-3.5" for simple, quick tasks (basic Q&A, simple formatting)
- Use "claude-sonnet-4.5" for most tasks (default, good balance of capability and speed)
- Use "claude-opus-4.5" for complex reasoning tasks (deep analysis, complex problem solving)

Respond ONLY with the JSON object, no additional text or markdown.`;

  console.log('[Claude] Generating agent config from description:', description.substring(0, 100));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: description }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Failed to generate agent configuration: No response text');
  }

  // Parse the JSON response
  try {
    // Try to extract JSON from the response (handle cases where model adds extra text)
    let jsonStr = textBlock.text.trim();

    // If wrapped in markdown code block, extract it
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const config = JSON.parse(jsonStr) as GeneratedAgentConfig;

    // Validate required fields
    if (!config.name || !config.system_prompt || !config.model) {
      throw new Error('Invalid agent configuration: missing required fields');
    }

    console.log('[Claude] Generated agent config:', config.name);
    return config;
  } catch (parseError) {
    console.error('[Claude] Failed to parse agent config:', textBlock.text);
    throw new Error('Failed to parse agent configuration. Please try again with a clearer description.');
  }
}
