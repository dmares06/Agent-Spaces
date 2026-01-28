import { BrowserWindow } from 'electron';
import * as db from '../database/db.js';

export type PermissionMode = 'safe' | 'ask' | 'allow-all' | 'inherit';
export type PermissionCategory = 'bash' | 'git' | 'file_write' | 'file_read' | 'network' | 'mcp';
export type PermissionDecision = 'allow' | 'deny';

export interface PermissionContext {
  workspaceId: string;
  chatId: string;
  agentId?: string;
  category: PermissionCategory;
  operation: string;
  details?: string;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Core permission service for checking and enforcing permissions
 */
export class PermissionService {
  private approvalTimeoutMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if an operation is allowed based on permission modes
   */
  async checkPermission(context: PermissionContext, mainWindow: BrowserWindow | null): Promise<PermissionResult> {
    console.log('[PermissionService] Checking permission:', context);

    // Step 1: Get effective permission mode
    const effectiveMode = this.getEffectivePermissionMode(context.workspaceId, context.agentId);
    console.log('[PermissionService] Effective mode:', effectiveMode);

    // Step 2: Handle different modes
    switch (effectiveMode) {
      case 'allow-all':
        return { allowed: true };

      case 'safe':
        // Safe mode: only read operations allowed
        if (context.category === 'file_read') {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: `Operation blocked by Safe Mode. ${context.category} operations are not allowed.`,
        };

      case 'ask':
        // Ask mode: check memory, session rules, then request approval
        return await this.checkWithApproval(context, mainWindow);

      default:
        // Default to 'ask' mode
        return await this.checkWithApproval(context, mainWindow);
    }
  }

  /**
   * Get the effective permission mode for an agent/workspace
   */
  private getEffectivePermissionMode(workspaceId: string, agentId?: string): PermissionMode {
    // Check agent-level mode first (if agent specified)
    if (agentId) {
      const agent = db.getAgent(agentId);
      if (agent && agent.permission_mode && agent.permission_mode !== 'inherit') {
        return agent.permission_mode as PermissionMode;
      }
    }

    // Fall back to workspace-level mode
    const workspace = db.getWorkspace(workspaceId);
    if (workspace && workspace.permission_mode) {
      return workspace.permission_mode as PermissionMode;
    }

    // Default to 'ask' mode
    return 'ask';
  }

  /**
   * Check permission with approval workflow
   */
  private async checkWithApproval(
    context: PermissionContext,
    mainWindow: BrowserWindow | null
  ): Promise<PermissionResult> {
    // Step 1: Check permission memory for cached decision
    const cachedDecision = this.checkPermissionMemory(context);
    if (cachedDecision !== null) {
      console.log('[PermissionService] Using cached decision:', cachedDecision);
      return {
        allowed: cachedDecision === 'allow',
        reason: cachedDecision === 'deny' ? 'Operation denied by permission memory' : undefined,
      };
    }

    // Step 2: Check session rules
    const ruleDecision = this.checkSessionRules(context);
    if (ruleDecision === 'allow') {
      console.log('[PermissionService] Allowed by session rule');
      return { allowed: true };
    } else if (ruleDecision === 'deny') {
      console.log('[PermissionService] Denied by session rule');
      return {
        allowed: false,
        reason: 'Operation denied by session rule',
      };
    }

    // Step 3: Request user approval
    return await this.requestApproval(context, mainWindow);
  }

  /**
   * Check permission memory for a cached decision
   */
  private checkPermissionMemory(context: PermissionContext): PermissionDecision | null {
    const memories = db.getPermissionMemory(context.workspaceId, context.agentId);

    // Find matching memory by category and pattern
    for (const memory of memories) {
      if (memory.category === context.category) {
        // Check if operation matches pattern
        if (this.matchesPattern(context.operation, memory.operation_pattern)) {
          return memory.decision;
        }
      }
    }

    return null;
  }

  /**
   * Check session rules for a decision
   */
  private checkSessionRules(context: PermissionContext): 'allow' | 'deny' | 'ask' {
    const database = db.getDatabase();
    const stmt = database.prepare('SELECT * FROM session_rules WHERE chat_id = ? AND category = ?');
    const rules = stmt.all(context.chatId, context.category) as Array<{
      action: string;
      pattern?: string;
    }>;

    for (const rule of rules) {
      if (!rule.pattern || this.matchesPattern(context.operation, rule.pattern)) {
        return rule.action as 'allow' | 'deny' | 'ask';
      }
    }

    return 'ask';
  }

  /**
   * Request user approval for an operation
   */
  private async requestApproval(
    context: PermissionContext,
    mainWindow: BrowserWindow | null
  ): Promise<PermissionResult> {
    if (!mainWindow) {
      console.warn('[PermissionService] No main window available for approval request');
      return {
        allowed: false,
        reason: 'Cannot request approval: no window available',
      };
    }

    // Create approval request in database
    const database = db.getDatabase();
    const requestId = db.generateId();
    const timestamp = db.now();

    const stmt = database.prepare(`
      INSERT INTO approval_requests (id, chat_id, category, operation, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `);

    stmt.run(requestId, context.chatId, context.category, context.operation, context.details || null, timestamp);

    console.log('[PermissionService] Created approval request:', requestId);

    // Send approval request to renderer
    mainWindow.webContents.send('approval-request', {
      id: requestId,
      category: context.category,
      operation: context.operation,
      details: context.details,
    });

    // Wait for approval response with timeout
    return await this.waitForApproval(requestId, mainWindow);
  }

  /**
   * Wait for user approval with timeout
   */
  private async waitForApproval(requestId: string, mainWindow: BrowserWindow): Promise<PermissionResult> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Timeout: deny by default
        console.log('[PermissionService] Approval request timed out:', requestId);

        // Update request status to denied
        const database = db.getDatabase();
        const stmt = database.prepare('UPDATE approval_requests SET status = ? WHERE id = ?');
        stmt.run('denied', requestId);

        cleanup();
        resolve({
          allowed: false,
          reason: 'Approval request timed out',
        });
      }, this.approvalTimeoutMs);

      const handler = (_event: any, data: { id: string; approved: boolean; remember?: boolean; pattern?: string }) => {
        if (data.id !== requestId) return;

        clearTimeout(timeout);
        console.log('[PermissionService] Received approval response:', data);

        // If "remember this" is checked, save to permission memory
        if (data.remember && data.pattern) {
          const database = db.getDatabase();
          const request = database
            .prepare('SELECT * FROM approval_requests WHERE id = ?')
            .get(requestId) as {
            chat_id: string;
            category: string;
          };

          if (request) {
            const chat = db.getChat(request.chat_id);
            if (chat) {
              db.createPermissionMemory({
                workspace_id: chat.workspace_id,
                agent_id: chat.agent_id,
                category: request.category as PermissionCategory,
                operation_pattern: data.pattern,
                decision: data.approved ? 'allow' : 'deny',
              });
              console.log('[PermissionService] Saved to permission memory');
            }
          }
        }

        cleanup();
        resolve({
          allowed: data.approved,
          reason: data.approved ? undefined : 'User denied the operation',
        });
      };

      const cleanup = () => {
        mainWindow.webContents.removeListener('approval-response', handler);
      };

      mainWindow.webContents.on('approval-response', handler);
    });
  }

  /**
   * Check if an operation matches a pattern
   */
  private matchesPattern(operation: string, pattern: string): boolean {
    // Simple pattern matching with wildcards
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(operation);
  }

  /**
   * Save a permission decision to memory
   */
  saveToMemory(
    workspaceId: string,
    agentId: string | undefined,
    category: PermissionCategory,
    pattern: string,
    decision: PermissionDecision
  ): void {
    db.createPermissionMemory({
      workspace_id: workspaceId,
      agent_id: agentId,
      category,
      operation_pattern: pattern,
      decision,
    });
    console.log('[PermissionService] Saved permission to memory:', { category, pattern, decision });
  }

  /**
   * Clear permission memory for a workspace/agent
   */
  clearMemory(workspaceId: string, agentId?: string): void {
    db.clearPermissionMemory(workspaceId, agentId);
    console.log('[PermissionService] Cleared permission memory');
  }
}

// Singleton instance
export const permissionService = new PermissionService();
