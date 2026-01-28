import { GoogleGenerativeAI, GenerativeModel, Content, Part } from '@google/generative-ai';
import { BrowserWindow } from 'electron';
import * as db from '../database/db.js';
import type { ChatMessage, StreamCallbacks, ExtendedMessage, ToolExecution } from './claudeService.js';
import { AGENT_TOOLS } from './toolDefinitions.js';
import { executeToolLocally, ToolContext } from './toolExecutor.js';

let googleClient: GoogleGenerativeAI | null = null;

/**
 * Initialize or get the Google AI client
 */
export function getClient(): GoogleGenerativeAI | null {
  if (googleClient) return googleClient;

  const apiKey = db.getSetting('google_api_key');
  if (!apiKey) {
    console.log('[Google AI] No API key configured');
    return null;
  }

  googleClient = new GoogleGenerativeAI(apiKey);
  console.log('[Google AI] Client initialized');
  return googleClient;
}

/**
 * Reset the client (call when API key changes)
 */
export function resetClient(): void {
  googleClient = null;
  console.log('[Google AI] Client reset');
}

/**
 * Map model names to actual Google AI model IDs
 */
function getModelId(model: string): string {
  const modelMap: Record<string, string> = {
    'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
    'gemini-1.5-pro': 'gemini-1.5-pro',
    'gemini-1.5-flash': 'gemini-1.5-flash',
  };
  return modelMap[model] || model;
}

/**
 * Convert Anthropic-style messages to Google AI format
 */
function convertMessages(messages: ChatMessage[]): Content[] {
  return messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
}

/**
 * Convert Anthropic-style tools to Google AI format
 */
function convertTools(tools: typeof AGENT_TOOLS) {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: tool.input_schema.properties,
      required: tool.input_schema.required || [],
    },
  }));
}

/**
 * Send a message to Google AI and stream the response
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
    const error = new Error('Google AI API key not configured. Please set your API key in Settings.');
    callbacks.onError?.(error);
    throw error;
  }

  const modelId = getModelId(options.model || 'gemini-1.5-flash');
  console.log('[Google AI] Streaming message with model:', modelId);

  let fullText = '';

  try {
    const generativeModel = client.getGenerativeModel({
      model: modelId,
      systemInstruction: options.systemPrompt,
    });

    const googleMessages = convertMessages(messages);

    // Google AI uses chat history (all messages except the last)
    const history = googleMessages.slice(0, -1);
    const lastMessage = googleMessages[googleMessages.length - 1];

    const chat = generativeModel.startChat({
      history,
    });

    const result = await chat.sendMessageStream(lastMessage.parts);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        callbacks.onText?.(text);

        // Send text chunk to renderer
        mainWindow?.webContents.send('message-chunk', {
          type: 'text',
          content: text,
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
    console.error('[Google AI] Stream error:', error);

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
 * Send a message to Google AI with tool use support and stream the response
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
    const error = new Error('Google AI API key not configured. Please set your API key in Settings.');
    callbacks.onError?.(error);
    throw error;
  }

  const modelId = getModelId(options.model || 'gemini-1.5-flash');
  const useTools = options.toolsEnabled !== false;

  console.log('[Google AI] Streaming message with tools, model:', modelId, 'tools:', useTools);

  let fullText = '';
  const toolExecutions: ToolExecution[] = [];

  try {
    const modelConfig: any = {
      model: modelId,
      systemInstruction: options.systemPrompt,
    };

    if (useTools) {
      modelConfig.tools = [{ functionDeclarations: convertTools(AGENT_TOOLS) }];
    }

    const generativeModel = client.getGenerativeModel(modelConfig);

    // Convert messages to Google AI format
    const googleMessages: Content[] = [];
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        googleMessages.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      } else {
        // Handle tool use and results
        const parts: Part[] = [];

        for (const block of msg.content) {
          if (block.type === 'text') {
            parts.push({ text: block.text });
          } else if (block.type === 'tool_use') {
            // Google AI uses functionCall format
            parts.push({
              functionCall: {
                name: block.name,
                args: block.input,
              },
            });
          } else if (block.type === 'tool_result') {
            // Google AI uses functionResponse format
            parts.push({
              functionResponse: {
                name: '', // We'll need to track tool names
                response: {
                  result: block.content,
                  error: block.is_error,
                },
              },
            });
          }
        }

        if (parts.length > 0) {
          googleMessages.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts,
          });
        }
      }
    }

    const history = googleMessages.slice(0, -1);
    const lastMessage = googleMessages[googleMessages.length - 1];

    const chat = generativeModel.startChat({
      history,
    });

    // Tool use loop
    let continueLoop = true;
    let currentMessage = lastMessage;

    while (continueLoop) {
      const result = await chat.sendMessageStream(currentMessage.parts);

      let iterationText = '';
      const functionCalls: Array<{ name: string; args: Record<string, unknown>; id: string }> = [];

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          iterationText += text;
          fullText += text;
          callbacks.onText?.(text);

          mainWindow?.webContents.send('message-chunk', {
            type: 'text',
            content: text,
          });
        }

        // Check for function calls
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          for (const fc of chunk.functionCalls) {
            const toolId = `tool_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            functionCalls.push({
              name: fc.name,
              args: fc.args as Record<string, unknown>,
              id: toolId,
            });

            mainWindow?.webContents.send('message-chunk', {
              type: 'tool_use_start',
              toolUseId: toolId,
              toolName: fc.name,
            });

            callbacks.onToolUse?.(fc.name, fc.args as Record<string, unknown>, toolId);
          }
        }
      }

      // Execute tools if any
      if (functionCalls.length > 0) {
        const functionResponses: Part[] = [];

        for (const fc of functionCalls) {
          const result = await executeToolLocally(
            fc.name,
            fc.args,
            toolContext,
            mainWindow
          );

          toolExecutions.push({
            toolUseId: fc.id,
            toolName: fc.name,
            input: fc.args,
            result: result.content,
            isError: result.isError,
          });

          callbacks.onToolResult?.(fc.id, result.content, result.isError);

          mainWindow?.webContents.send('message-chunk', {
            type: 'tool_result',
            toolUseId: fc.id,
            toolName: fc.name,
            result: result.content,
            isError: result.isError,
          });

          functionResponses.push({
            functionResponse: {
              name: fc.name,
              response: {
                result: result.content,
                error: result.isError,
              },
            },
          });
        }

        // Continue with function responses
        currentMessage = {
          role: 'user',
          parts: functionResponses,
        };
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
    console.error('[Google AI] Stream error:', error);

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
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hi');
    return !!result.response.text();
  } catch (error) {
    console.error('[Google AI] Connection test failed:', error);
    return false;
  }
}
