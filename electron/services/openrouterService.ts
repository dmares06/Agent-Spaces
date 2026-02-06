import OpenAI from 'openai';
import { BrowserWindow } from 'electron';
import * as db from '../database/db.js';
import type { ChatMessage, StreamCallbacks, ExtendedMessage, ToolExecution } from './claudeService.js';
import { AGENT_TOOLS } from './toolDefinitions.js';
import { executeToolLocally, ToolContext } from './toolExecutor.js';

let openrouterClient: OpenAI | null = null;

/**
 * Initialize or get the OpenRouter client
 */
export function getClient(): OpenAI | null {
  if (openrouterClient) return openrouterClient;

  const apiKey = db.getSetting('openrouter_api_key');
  if (!apiKey) {
    console.log('[OpenRouter] No API key configured');
    return null;
  }

  openrouterClient = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/agent-spaces',
      'X-Title': 'Agent Spaces',
    },
  });
  console.log('[OpenRouter] Client initialized');
  return openrouterClient;
}

/**
 * Reset the client (call when API key changes)
 */
export function resetClient(): void {
  openrouterClient = null;
  console.log('[OpenRouter] Client reset');
}

/**
 * Strip the openrouter/ prefix to get the real model ID
 * e.g. "openrouter/google/gemini-2.5-pro" → "google/gemini-2.5-pro"
 */
function getModelId(model: string): string {
  if (model.startsWith('openrouter/')) {
    return model.slice('openrouter/'.length);
  }
  return model;
}

/**
 * Convert Anthropic-style messages to OpenAI format
 */
function convertMessages(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));
}

/**
 * Convert Anthropic-style tools to OpenAI format
 */
function convertTools(tools: typeof AGENT_TOOLS): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

/**
 * Send a message to OpenRouter and stream the response
 */
export async function streamMessage(
  messages: ChatMessage[],
  options: {
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
  },
  callbacks: StreamCallbacks,
  mainWindow: BrowserWindow | null
): Promise<{ content: string }> {
  const client = getClient();
  if (!client) {
    const error = new Error('OpenRouter API key not configured. Please set your API key in Settings.');
    callbacks.onError?.(error);
    throw error;
  }

  const model = getModelId(options.model || 'openrouter/auto');
  console.log('[OpenRouter] Streaming message with model:', model);

  let fullText = '';

  try {
    const openaiMessages = convertMessages(messages);

    // Add system message if provided
    if (options.systemPrompt) {
      openaiMessages.unshift({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    const stream = await client.chat.completions.create({
      model,
      messages: openaiMessages,
      max_tokens: options.maxTokens || 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        fullText += delta.content;
        callbacks.onText?.(delta.content);

        // Send text chunk to renderer
        mainWindow?.webContents.send('message-chunk', {
          type: 'text',
          content: delta.content,
        });
      }
    }

    // Signal completion
    mainWindow?.webContents.send('message-chunk', {
      type: 'complete',
      content: fullText,
    });

    callbacks.onComplete?.(fullText);

    return { content: fullText };
  } catch (error: any) {
    console.error('[OpenRouter] Stream error:', error);

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
 * Send a message to OpenRouter with tool use support and stream the response
 */
export async function streamMessageWithTools(
  messages: ExtendedMessage[],
  options: {
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
    toolsEnabled?: boolean;
  },
  toolContext: ToolContext,
  callbacks: StreamCallbacks,
  mainWindow: BrowserWindow | null
): Promise<{ content: string; toolExecutions: ToolExecution[] }> {
  const client = getClient();
  if (!client) {
    const error = new Error('OpenRouter API key not configured. Please set your API key in Settings.');
    callbacks.onError?.(error);
    throw error;
  }

  const model = getModelId(options.model || 'openrouter/auto');
  const useTools = options.toolsEnabled !== false;

  console.log('[OpenRouter] Streaming message with tools, model:', model, 'tools:', useTools);

  let fullText = '';
  const toolExecutions: ToolExecution[] = [];
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  // Add system message if provided
  if (options.systemPrompt) {
    openaiMessages.push({
      role: 'system',
      content: options.systemPrompt,
    });
  }

  // Convert messages to OpenAI format
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      openaiMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    } else {
      // Handle tool use and results
      const textContent = msg.content.find(block => block.type === 'text');
      const toolUseBlocks = msg.content.filter(block => block.type === 'tool_use');
      const toolResultBlocks = msg.content.filter(block => block.type === 'tool_result');

      if (msg.role === 'assistant' && toolUseBlocks.length > 0) {
        // Assistant message with tool calls
        const tool_calls: OpenAI.Chat.ChatCompletionMessageToolCall[] = toolUseBlocks.map((block: any) => ({
          id: block.id,
          type: 'function' as const,
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        }));

        openaiMessages.push({
          role: 'assistant',
          content: textContent && 'text' in textContent ? textContent.text : null,
          tool_calls,
        });
      } else if (msg.role === 'user' && toolResultBlocks.length > 0) {
        // Tool results
        for (const block of toolResultBlocks) {
          if (block.type === 'tool_result') {
            openaiMessages.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: block.content,
            });
          }
        }
      } else if (textContent && 'text' in textContent) {
        openaiMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: textContent.text,
        });
      }
    }
  }

  // Tool use loop
  let continueLoop = true;

  try {
    while (continueLoop) {
      const requestParams: OpenAI.Chat.ChatCompletionCreateParams = {
        model,
        messages: openaiMessages,
        max_tokens: options.maxTokens || 4096,
        stream: true,
      };

      if (useTools) {
        requestParams.tools = convertTools(AGENT_TOOLS);
        requestParams.tool_choice = 'auto';
      }

      const stream = await client.chat.completions.create(requestParams);

      let iterationText = '';
      const toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];
      let currentToolCall: Partial<OpenAI.Chat.ChatCompletionMessageToolCall> | null = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          iterationText += delta.content;
          fullText += delta.content;
          callbacks.onText?.(delta.content);

          mainWindow?.webContents.send('message-chunk', {
            type: 'text',
            content: delta.content,
          });
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.index !== undefined) {
              if (!currentToolCall || toolCall.index !== toolCalls.length - 1) {
                // Start new tool call
                currentToolCall = {
                  id: toolCall.id || '',
                  type: 'function',
                  function: {
                    name: toolCall.function?.name || '',
                    arguments: toolCall.function?.arguments || '',
                  },
                };

                if (toolCall.id) {
                  mainWindow?.webContents.send('message-chunk', {
                    type: 'tool_use_start',
                    toolUseId: toolCall.id,
                    toolName: toolCall.function?.name || '',
                  });
                }
              } else {
                // Append to existing tool call
                if (currentToolCall.function && toolCall.function?.arguments) {
                  currentToolCall.function.arguments += toolCall.function.arguments;
                }
              }

              if (currentToolCall && currentToolCall.id && currentToolCall.function?.name) {
                toolCalls[toolCall.index] = currentToolCall as OpenAI.Chat.ChatCompletionMessageToolCall;
              }
            }
          }
        }

        // Check if finished
        if (chunk.choices[0]?.finish_reason === 'tool_calls') {
          continueLoop = true;
        } else if (chunk.choices[0]?.finish_reason === 'stop') {
          continueLoop = false;
        }
      }

      // If we have tool calls, execute them
      if (toolCalls.length > 0) {
        // Add assistant message with tool calls
        openaiMessages.push({
          role: 'assistant',
          content: iterationText || null,
          tool_calls: toolCalls,
        });

        // Execute tools
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          const toolInput = JSON.parse(toolCall.function.arguments);

          callbacks.onToolUse?.(toolName, toolInput, toolCall.id);

          const result = await executeToolLocally(
            toolName,
            toolInput,
            toolContext,
            mainWindow
          );

          toolExecutions.push({
            toolUseId: toolCall.id,
            toolName,
            input: toolInput,
            result: result.content,
            isError: result.isError,
          });

          callbacks.onToolResult?.(toolCall.id, result.content, result.isError);

          mainWindow?.webContents.send('message-chunk', {
            type: 'tool_result',
            toolUseId: toolCall.id,
            toolName,
            result: result.content,
            isError: result.isError,
          });

          // Add tool result message
          openaiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result.content,
          });
        }
      } else {
        continueLoop = false;
      }
    }

    // Signal completion
    mainWindow?.webContents.send('message-chunk', {
      type: 'complete',
      content: fullText,
      toolExecutions,
    });

    callbacks.onComplete?.(fullText);

    return { content: fullText, toolExecutions };
  } catch (error: any) {
    console.error('[OpenRouter] Stream error:', error);

    mainWindow?.webContents.send('message-chunk', {
      type: 'error',
      error: error.message,
    });

    callbacks.onError?.(error);
    throw error;
  }
}

/**
 * Test the API connection
 */
export async function testConnection(): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    await client.chat.completions.create({
      model: 'openrouter/auto',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });
    return true;
  } catch (error) {
    console.error('[OpenRouter] Connection test failed:', error);
    return false;
  }
}
