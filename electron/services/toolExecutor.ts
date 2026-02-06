import { BrowserWindow } from 'electron';
import * as db from '../database/db.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { permissionEnforcer } from './permissionEnforcer.js';
import { browserService } from './browserService.js';

/**
 * Result of a tool execution
 */
export interface ToolResult {
  content: string;
  isError: boolean;
}

/**
 * Context for tool execution
 */
export interface ToolContext {
  workspaceId: string;
  chatId: string;
  agentId?: string;
  browserMode?: boolean;
}

/**
 * Execute a tool locally and return the result
 */
export async function executeToolLocally(
  toolName: string,
  input: Record<string, unknown>,
  context: ToolContext,
  mainWindow: BrowserWindow | null
): Promise<ToolResult> {
  console.log(`[ToolExecutor] Executing tool: ${toolName}`, input);

  try {
    switch (toolName) {
      case 'create_task':
        return await executeCreateTask(
          input as { title: string; description?: string },
          context,
          mainWindow
        );
      case 'update_task':
        return await executeUpdateTask(
          input as { task_id: string; status?: string; progress?: number },
          mainWindow
        );
      case 'attach_file':
        return await executeAttachFile(
          input as { name: string; path: string },
          context,
          mainWindow
        );
      case 'read_file':
        return await executeReadFile(input as { path: string }, context, mainWindow);

      // Browser automation tools
      case 'browser_navigate': {
        const { url } = input as { url: string };
        const result = await browserService.navigate(url);
        return {
          content: JSON.stringify({
            success: result.success,
            message: result.message,
            url: result.url
          }),
          isError: !result.success
        };
      }

      case 'browser_click': {
        const { selector } = input as { selector: string };
        const result = await browserService.click(selector);
        return {
          content: JSON.stringify({
            success: result.success,
            message: result.message,
            selector
          }),
          isError: !result.success
        };
      }

      case 'browser_fill_form': {
        const { selector, value } = input as { selector: string; value: string };
        const result = await browserService.fillForm(selector, value);
        return {
          content: JSON.stringify({
            success: result.success,
            message: result.message,
            selector,
            value
          }),
          isError: !result.success
        };
      }

      case 'browser_screenshot': {
        const { filename } = input as { filename?: string };
        const result = await browserService.screenshot(filename);
        return {
          content: JSON.stringify({
            success: result.success,
            message: result.message,
            screenshotPath: result.path
          }),
          isError: !result.success
        };
      }

      case 'browser_read_content': {
        const { selector } = input as { selector?: string };
        const result = await browserService.readContent(selector);
        return {
          content: JSON.stringify({
            success: result.success,
            content: result.content,
            message: result.message
          }),
          isError: !result.success
        };
      }

      case 'browser_wait': {
        const { selector, timeout } = input as { selector: string; timeout?: number };
        const result = await browserService.waitFor(selector, timeout);
        return {
          content: JSON.stringify({
            success: result.success,
            message: result.message
          }),
          isError: !result.success
        };
      }

      // Personal task tool
      case 'create_personal_task':
        return await executeCreatePersonalTask(
          input as {
            title: string;
            description?: string;
            priority?: string;
            status?: string;
            due_date?: string;
          },
          context,
          mainWindow
        );

      default:
        return {
          content: JSON.stringify({
            success: false,
            error: `Unknown tool: ${toolName}`,
          }),
          isError: true,
        };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ToolExecutor] Error executing ${toolName}:`, error);
    return {
      content: JSON.stringify({
        success: false,
        error: `Error executing ${toolName}: ${errorMessage}`,
      }),
      isError: true,
    };
  }
}

/**
 * Create a new task
 */
async function executeCreateTask(
  input: { title: string; description?: string },
  context: ToolContext,
  mainWindow: BrowserWindow | null
): Promise<ToolResult> {
  const database = db.getDatabase();
  const id = db.generateId();
  const timestamp = db.now();

  const stmt = database.prepare(`
    INSERT INTO tasks (id, workspace_id, agent_id, chat_id, title, description, status, progress, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?)
  `);

  stmt.run(
    id,
    context.workspaceId,
    context.agentId || null,
    context.chatId,
    input.title,
    input.description || null,
    timestamp
  );

  const task = database.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  // Emit real-time update to UI
  if (mainWindow) {
    mainWindow.webContents.send('task-update', task);
  }

  return {
    content: JSON.stringify({
      success: true,
      task_id: id,
      message: `Task "${input.title}" created successfully`,
    }),
    isError: false,
  };
}

/**
 * Update an existing task
 */
async function executeUpdateTask(
  input: { task_id: string; status?: string; progress?: number },
  mainWindow: BrowserWindow | null
): Promise<ToolResult> {
  const database = db.getDatabase();

  // Check if task exists
  const existingTask = database.prepare('SELECT * FROM tasks WHERE id = ?').get(input.task_id);
  if (!existingTask) {
    return {
      content: JSON.stringify({
        success: false,
        error: `Task with ID ${input.task_id} not found`,
      }),
      isError: true,
    };
  }

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (input.status) {
    updates.push('status = ?');
    params.push(input.status);

    if (input.status === 'completed' || input.status === 'failed') {
      updates.push('completed_at = ?');
      params.push(db.now());
    }

    if (input.status === 'completed') {
      updates.push('progress = 100');
    }
  }

  if (input.progress !== undefined && input.status !== 'completed') {
    updates.push('progress = ?');
    params.push(Math.min(Math.max(input.progress, 0), 100));
  }

  if (updates.length > 0) {
    params.push(input.task_id);
    const stmt = database.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);
  }

  const updatedTask = database.prepare('SELECT * FROM tasks WHERE id = ?').get(input.task_id) as {
    status: string;
    progress: number;
  };

  // Emit real-time update to UI
  if (mainWindow) {
    mainWindow.webContents.send('task-update', updatedTask);
  }

  return {
    content: JSON.stringify({
      success: true,
      task_id: input.task_id,
      message: 'Task updated successfully',
      current_status: updatedTask.status,
      current_progress: updatedTask.progress,
    }),
    isError: false,
  };
}

/**
 * Attach a file to the Files panel
 */
async function executeAttachFile(
  input: { name: string; path: string },
  context: ToolContext,
  mainWindow: BrowserWindow | null
): Promise<ToolResult> {
  // Validate file exists
  try {
    const stats = await fs.stat(input.path);

    const database = db.getDatabase();
    const id = db.generateId();
    const timestamp = db.now();

    const stmt = database.prepare(`
      INSERT INTO attachments (id, chat_id, name, path, mime_type, size, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const mimeType = getMimeType(input.path);
    const fileType = 'reference';

    stmt.run(id, context.chatId, input.name, input.path, mimeType, stats.size, fileType, timestamp);

    const attachment = database.prepare('SELECT * FROM attachments WHERE id = ?').get(id);

    // Emit real-time update to UI
    if (mainWindow) {
      mainWindow.webContents.send('attachment-added', attachment);
    }

    return {
      content: JSON.stringify({
        success: true,
        attachment_id: id,
        message: `File "${input.name}" attached successfully`,
        size: stats.size,
        type: fileType,
      }),
      isError: false,
    };
  } catch (error: unknown) {
    const errorObj = error as NodeJS.ErrnoException;
    if (errorObj.code === 'ENOENT') {
      return {
        content: JSON.stringify({
          success: false,
          error: `File not found: ${input.path}`,
        }),
        isError: true,
      };
    }
    throw error;
  }
}

/**
 * Read the contents of a file
 */
async function executeReadFile(input: { path: string }, context: ToolContext, mainWindow: BrowserWindow | null): Promise<ToolResult> {
  try {
    // Check permission for file read
    await permissionEnforcer.enforceFileRead(
      context.workspaceId,
      context.chatId,
      input.path,
      async () => {
        // Permission granted
      },
      mainWindow,
      context.agentId
    );

    const content = await fs.readFile(input.path, 'utf-8');

    // Limit content size for API
    const maxLength = 100000; // ~100KB
    const truncated = content.length > maxLength;
    const returnContent = truncated ? content.substring(0, maxLength) : content;

    return {
      content: JSON.stringify({
        success: true,
        path: input.path,
        content: returnContent,
        truncated,
        totalLength: content.length,
      }),
      isError: false,
    };
  } catch (error: unknown) {
    const errorObj = error as NodeJS.ErrnoException;

    // Handle permission errors
    if (errorObj.name === 'PermissionDeniedError') {
      return {
        content: JSON.stringify({
          success: false,
          error: `Permission denied: ${errorObj.message}`,
        }),
        isError: true,
      };
    }

    if (errorObj.code === 'ENOENT') {
      return {
        content: JSON.stringify({
          success: false,
          error: `File not found: ${input.path}`,
        }),
        isError: true,
      };
    }
    if (errorObj.code === 'EISDIR') {
      return {
        content: JSON.stringify({
          success: false,
          error: `Path is a directory, not a file: ${input.path}`,
        }),
        isError: true,
      };
    }
    return {
      content: JSON.stringify({
        success: false,
        error: `Failed to read file: ${errorObj.message}`,
      }),
      isError: true,
    };
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript-jsx',
    '.jsx': 'text/javascript-jsx',
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.css': 'text/css',
    '.py': 'text/x-python',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.xml': 'application/xml',
    '.sh': 'text/x-shellscript',
    '.sql': 'text/x-sql',
    '.go': 'text/x-go',
    '.rs': 'text/x-rust',
    '.java': 'text/x-java',
    '.c': 'text/x-c',
    '.cpp': 'text/x-c++',
    '.h': 'text/x-c-header',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Create a personal task on the user's Kanban board
 */
async function executeCreatePersonalTask(
  input: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    due_date?: string;
  },
  context: ToolContext,
  mainWindow: BrowserWindow | null
): Promise<ToolResult> {
  try {
    const database = db.getDatabase();
    const id = db.generateId();
    const timestamp = db.now();

    // Validate and normalize inputs
    const priority = ['low', 'medium', 'high'].includes(input.priority || '')
      ? input.priority
      : 'medium';

    const status = ['todo', 'working', 'completed'].includes(input.status || '')
      ? input.status
      : 'todo';

    // Validate due_date format if provided
    let dueDate: string | null = null;
    if (input.due_date) {
      const dateMatch = input.due_date.match(/^\d{4}-\d{2}-\d{2}$/);
      if (dateMatch) {
        dueDate = input.due_date;
      }
    }

    const stmt = database.prepare(`
      INSERT INTO personal_tasks (id, title, description, status, priority, due_date, created_at, created_by_agent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.title,
      input.description || null,
      status,
      priority,
      dueDate,
      timestamp,
      context.agentId || null
    );

    const personalTask = database.prepare('SELECT * FROM personal_tasks WHERE id = ?').get(id);

    // Emit real-time update to UI so Kanban board updates immediately
    if (mainWindow) {
      mainWindow.webContents.send('personal-task-created', personalTask);
    }

    return {
      content: JSON.stringify({
        success: true,
        task_id: id,
        message: `Personal task "${input.title}" added to your Kanban board`,
        priority,
        status,
        due_date: dueDate,
      }),
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ToolExecutor] Error creating personal task:', error);
    return {
      content: JSON.stringify({
        success: false,
        error: `Failed to create personal task: ${errorMessage}`,
      }),
      isError: true,
    };
  }
}
