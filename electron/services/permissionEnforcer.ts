import { BrowserWindow } from 'electron';
import { permissionService, PermissionCategory, PermissionContext, PermissionResult } from './permissionService.js';

/**
 * Wrapper for enforcing permissions before operations
 */
export class PermissionEnforcer {
  /**
   * Enforce permission check before executing an operation
   */
  async enforce<T>(
    context: Omit<PermissionContext, 'category'> & { category: PermissionCategory },
    operation: () => Promise<T> | T,
    mainWindow: BrowserWindow | null
  ): Promise<T> {
    // Check permission
    const result = await permissionService.checkPermission(context, mainWindow);

    if (!result.allowed) {
      const error = new PermissionDeniedError(result.reason || 'Permission denied');
      console.error('[PermissionEnforcer] Permission denied:', error.message);
      throw error;
    }

    // Execute the operation
    return await operation();
  }

  /**
   * Check permission without executing (for conditional logic)
   */
  async check(
    context: PermissionContext,
    mainWindow: BrowserWindow | null
  ): Promise<PermissionResult> {
    return await permissionService.checkPermission(context, mainWindow);
  }

  /**
   * Convenience method for bash operations
   */
  async enforceBash<T>(
    workspaceId: string,
    chatId: string,
    command: string,
    operation: () => Promise<T> | T,
    mainWindow: BrowserWindow | null,
    agentId?: string
  ): Promise<T> {
    return this.enforce(
      {
        workspaceId,
        chatId,
        agentId,
        category: 'bash',
        operation: command,
        details: `Execute command: ${command}`,
      },
      operation,
      mainWindow
    );
  }

  /**
   * Convenience method for git operations
   */
  async enforceGit<T>(
    workspaceId: string,
    chatId: string,
    gitOperation: string,
    operation: () => Promise<T> | T,
    mainWindow: BrowserWindow | null,
    agentId?: string
  ): Promise<T> {
    return this.enforce(
      {
        workspaceId,
        chatId,
        agentId,
        category: 'git',
        operation: gitOperation,
        details: `Git operation: ${gitOperation}`,
      },
      operation,
      mainWindow
    );
  }

  /**
   * Convenience method for file write operations
   */
  async enforceFileWrite<T>(
    workspaceId: string,
    chatId: string,
    filePath: string,
    operation: () => Promise<T> | T,
    mainWindow: BrowserWindow | null,
    agentId?: string
  ): Promise<T> {
    return this.enforce(
      {
        workspaceId,
        chatId,
        agentId,
        category: 'file_write',
        operation: filePath,
        details: `Write to file: ${filePath}`,
      },
      operation,
      mainWindow
    );
  }

  /**
   * Convenience method for file read operations
   */
  async enforceFileRead<T>(
    workspaceId: string,
    chatId: string,
    filePath: string,
    operation: () => Promise<T> | T,
    mainWindow: BrowserWindow | null,
    agentId?: string
  ): Promise<T> {
    return this.enforce(
      {
        workspaceId,
        chatId,
        agentId,
        category: 'file_read',
        operation: filePath,
        details: `Read file: ${filePath}`,
      },
      operation,
      mainWindow
    );
  }

  /**
   * Convenience method for network operations
   */
  async enforceNetwork<T>(
    workspaceId: string,
    chatId: string,
    url: string,
    operation: () => Promise<T> | T,
    mainWindow: BrowserWindow | null,
    agentId?: string
  ): Promise<T> {
    return this.enforce(
      {
        workspaceId,
        chatId,
        agentId,
        category: 'network',
        operation: url,
        details: `Network request: ${url}`,
      },
      operation,
      mainWindow
    );
  }

  /**
   * Convenience method for MCP operations
   */
  async enforceMCP<T>(
    workspaceId: string,
    chatId: string,
    mcpServer: string,
    operation: () => Promise<T> | T,
    mainWindow: BrowserWindow | null,
    agentId?: string
  ): Promise<T> {
    return this.enforce(
      {
        workspaceId,
        chatId,
        agentId,
        category: 'mcp',
        operation: mcpServer,
        details: `MCP server: ${mcpServer}`,
      },
      operation,
      mainWindow
    );
  }
}

/**
 * Custom error for permission denial
 */
export class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

// Singleton instance
export const permissionEnforcer = new PermissionEnforcer();
