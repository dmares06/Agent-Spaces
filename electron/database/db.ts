import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

let db: Database.Database | null = null;

// Embedded schema to avoid file path issues with bundling
const SCHEMA = `
-- AgentSpaces Database Schema
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  folder_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  system_prompt TEXT,
  model TEXT DEFAULT 'claude-sonnet-4.5',
  thinking_enabled INTEGER DEFAULT 0,
  parent_agent_id TEXT,
  config TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (parent_agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  attachments TEXT,
  thinking_content TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('mcp', 'function', 'script')),
  config TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_skills (
  agent_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  PRIMARY KEY (agent_id, skill_id),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  args TEXT NOT NULL,
  env TEXT,
  workspace_id TEXT,
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hooks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  event TEXT NOT NULL,
  condition TEXT,
  action TEXT NOT NULL,
  action_config TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_id TEXT,
  assigned_to_agent_id TEXT,
  chat_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'planning', 'working', 'review', 'needs_input', 'complete', 'failed')),
  progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
  result TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  started_at TEXT,
  last_activity TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS canvases (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  name TEXT NOT NULL,
  thumbnail TEXT,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  chat_id TEXT,
  message_id TEXT,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  type TEXT DEFAULT 'context' CHECK(type IN ('context', 'upload', 'reference')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_rules (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('bash', 'git', 'file_write', 'file_read', 'network', 'mcp')),
  pattern TEXT,
  action TEXT NOT NULL CHECK(action IN ('allow', 'deny', 'ask')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  category TEXT NOT NULL,
  operation TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS execution_logs (
  id TEXT PRIMARY KEY,
  chat_id TEXT,
  task_id TEXT,
  level TEXT NOT NULL CHECK(level IN ('info', 'error', 'success', 'thinking')),
  message TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chats_workspace ON chats(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chats_agent ON chats(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_skills_workspace ON skills(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_workspace ON mcp_servers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hooks_workspace ON hooks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_chat ON tasks(chat_id);
CREATE INDEX IF NOT EXISTS idx_canvases_workspace ON canvases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_canvases_created ON canvases(created_at);
CREATE INDEX IF NOT EXISTS idx_attachments_chat ON attachments(chat_id);
CREATE INDEX IF NOT EXISTS idx_session_rules_chat ON session_rules(chat_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_chat ON approval_requests(chat_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_chat ON execution_logs(chat_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_task ON execution_logs(task_id);

-- Personal Tasks (separate from agent tasks)
CREATE TABLE IF NOT EXISTS personal_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'working', 'review', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),

  -- Date/time tracking
  due_date TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  started_at TEXT,
  reminder_time TEXT,

  -- Organization
  workspace_id TEXT,
  tags TEXT,
  notes TEXT,

  -- Agent tracking (optional)
  created_by_agent_id TEXT,
  last_modified_by_agent_id TEXT,
  last_notified_at TEXT,

  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  FOREIGN KEY (last_modified_by_agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_tasks_status ON personal_tasks(status);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_workspace ON personal_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_personal_tasks_due_date ON personal_tasks(due_date);
`;

/**
 * Run database migrations for schema updates
 */
function runMigrations(database: Database.Database): void {
  console.log('[DB] Running migrations...');

  // Get database schema version directly
  const stmt = database.prepare('SELECT value FROM settings WHERE key = ?');
  const result = stmt.get('schema_version') as { value: string } | undefined;
  const schemaVersion = result?.value || '0';
  const currentVersion = parseInt(schemaVersion, 10);

  // Migration 1: Add task assignment columns (v1)
  if (currentVersion < 1) {
    console.log('[DB] Running migration 1: Task assignment system');

    try {
      // Check if columns exist by querying table info
      const tableInfo = database.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
      const columnNames = tableInfo.map(col => col.name);

      // Add new columns if they don't exist
      if (!columnNames.includes('assigned_to_agent_id')) {
        database.exec('ALTER TABLE tasks ADD COLUMN assigned_to_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL');
        console.log('[DB] Added assigned_to_agent_id column');
      }

      if (!columnNames.includes('started_at')) {
        database.exec('ALTER TABLE tasks ADD COLUMN started_at TEXT');
        console.log('[DB] Added started_at column');
      }

      if (!columnNames.includes('last_activity')) {
        database.exec('ALTER TABLE tasks ADD COLUMN last_activity TEXT');
        console.log('[DB] Added last_activity column');
      }

      // Create indexes if they don't exist
      database.exec('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_agent_id)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id)');

      // Migrate existing status values to new phases
      // pending → todo
      // in_progress → working
      // completed → complete
      // failed → failed (unchanged)
      database.exec(`
        UPDATE tasks SET status =
          CASE
            WHEN status = 'pending' THEN 'todo'
            WHEN status = 'in_progress' THEN 'working'
            WHEN status = 'completed' THEN 'complete'
            ELSE status
          END
      `);
      console.log('[DB] Migrated task status values to new workflow phases');

      // Set schema version directly
      const timestamp = now();
      const setStmt = database.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
      `);
      setStmt.run('schema_version', '1', timestamp, '1', timestamp);
      console.log('[DB] Migration 1 completed successfully');
    } catch (error) {
      console.error('[DB] Migration 1 failed:', error);
      // Don't throw - let app continue with potentially partial migration
    }
  }

  // Migration 2: Permission Modes + Status Workflow (v2)
  if (currentVersion < 2) {
    console.log('[DB] Running migration 2: Permission Modes + Status Workflow');

    try {
      // Check existing columns
      const workspaceInfo = database.prepare("PRAGMA table_info(workspaces)").all() as Array<{ name: string }>;
      const agentInfo = database.prepare("PRAGMA table_info(agents)").all() as Array<{ name: string }>;
      const chatInfo = database.prepare("PRAGMA table_info(chats)").all() as Array<{ name: string }>;

      const workspaceColumns = workspaceInfo.map(col => col.name);
      const agentColumns = agentInfo.map(col => col.name);
      const chatColumns = chatInfo.map(col => col.name);

      // Add permission_mode to workspaces
      if (!workspaceColumns.includes('permission_mode')) {
        database.exec("ALTER TABLE workspaces ADD COLUMN permission_mode TEXT DEFAULT 'ask' CHECK(permission_mode IN ('safe', 'ask', 'allow-all'))");
        console.log('[DB] Added permission_mode column to workspaces');
      }

      // Add permission_mode to agents
      if (!agentColumns.includes('permission_mode')) {
        database.exec("ALTER TABLE agents ADD COLUMN permission_mode TEXT CHECK(permission_mode IN ('safe', 'ask', 'allow-all', 'inherit'))");
        console.log('[DB] Added permission_mode column to agents');
      }

      // Create permission_memory table
      database.exec(`
        CREATE TABLE IF NOT EXISTS permission_memory (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          agent_id TEXT,
          category TEXT NOT NULL CHECK(category IN ('bash', 'git', 'file_write', 'file_read', 'network', 'mcp')),
          operation_pattern TEXT NOT NULL,
          decision TEXT NOT NULL CHECK(decision IN ('allow', 'deny')),
          created_at TEXT NOT NULL,
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        )
      `);
      console.log('[DB] Created permission_memory table');

      // Add status and is_flagged to chats
      if (!chatColumns.includes('status')) {
        database.exec("ALTER TABLE chats ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active', 'todo', 'in_progress', 'needs_review', 'done', 'archived'))");
        console.log('[DB] Added status column to chats');
      }

      if (!chatColumns.includes('is_flagged')) {
        database.exec("ALTER TABLE chats ADD COLUMN is_flagged INTEGER DEFAULT 0");
        console.log('[DB] Added is_flagged column to chats');
      }

      // Create indexes
      database.exec('CREATE INDEX IF NOT EXISTS idx_permission_memory_workspace ON permission_memory(workspace_id)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_permission_memory_agent ON permission_memory(agent_id)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_chats_flagged ON chats(is_flagged)');
      console.log('[DB] Created indexes for permission_memory, approval_requests, and chats');

      // Set schema version directly
      const timestamp = now();
      const setStmt = database.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
      `);
      setStmt.run('schema_version', '2', timestamp, '2', timestamp);
      console.log('[DB] Migration 2 completed successfully');
    } catch (error) {
      console.error('[DB] Migration 2 failed:', error);
      // Don't throw - let app continue with potentially partial migration
    }
  }

  // Migration 3: Add category columns (v3)
  if (currentVersion < 3) {
    console.log('[DB] Running migration 3: Add category columns');

    try {
      // Check existing columns
      const agentsInfo = database.prepare("PRAGMA table_info(agents)").all() as Array<{ name: string }>;
      const skillsInfo = database.prepare("PRAGMA table_info(skills)").all() as Array<{ name: string }>;
      const mcpInfo = database.prepare("PRAGMA table_info(mcp_servers)").all() as Array<{ name: string }>;

      const agentColumns = agentsInfo.map(col => col.name);
      const skillColumns = skillsInfo.map(col => col.name);
      const mcpColumns = mcpInfo.map(col => col.name);

      // Add category column to agents
      if (!agentColumns.includes('category')) {
        database.exec('ALTER TABLE agents ADD COLUMN category TEXT DEFAULT NULL');
        console.log('[DB] Added category column to agents');

        // Migrate existing agent categories from config JSON
        const agents = database.prepare(`SELECT id, config FROM agents WHERE config IS NOT NULL`).all() as Array<{ id: string; config: string }>;
        let migratedCount = 0;

        for (const agent of agents) {
          try {
            const config = JSON.parse(agent.config || '{}');
            if (config.category && typeof config.category === 'string') {
              database.prepare(`UPDATE agents SET category = ? WHERE id = ?`).run(config.category, agent.id);
              migratedCount++;
            }
          } catch (error) {
            console.error('[DB] Failed to migrate agent category:', agent.id, error);
          }
        }

        console.log(`[DB] Migrated ${migratedCount} agent categories from config JSON`);
      }

      // Add category column to skills
      if (!skillColumns.includes('category')) {
        database.exec('ALTER TABLE skills ADD COLUMN category TEXT DEFAULT NULL');
        console.log('[DB] Added category column to skills');
      }

      // Add category column to mcp_servers
      if (!mcpColumns.includes('category')) {
        database.exec('ALTER TABLE mcp_servers ADD COLUMN category TEXT DEFAULT NULL');
        console.log('[DB] Added category column to mcp_servers');
      }

      // Create indexes for better query performance
      database.exec('CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_mcp_servers_category ON mcp_servers(category)');
      console.log('[DB] Created category indexes');

      // Set schema version directly
      const timestamp = now();
      const setStmt = database.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
      `);
      setStmt.run('schema_version', '3', timestamp, '3', timestamp);
      console.log('[DB] Migration 3 completed successfully');
    } catch (error) {
      console.error('[DB] Migration 3 failed:', error);
      // Don't throw - let app continue with potentially partial migration
    }
  }

  // Migration 4: Scheduled Tasks + Telegram Integration (v4)
  if (currentVersion < 4) {
    console.log('[DB] Running migration 4: Scheduled Tasks + Telegram Integration');

    try {
      // Create scheduled_tasks table
      database.exec(`
        CREATE TABLE IF NOT EXISTS scheduled_tasks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          cron_expression TEXT NOT NULL,
          command TEXT NOT NULL,
          working_directory TEXT,
          enabled INTEGER DEFAULT 1,
          last_run_at TEXT,
          next_run_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      console.log('[DB] Created scheduled_tasks table');

      // Create scheduled_task_runs table for execution history
      database.exec(`
        CREATE TABLE IF NOT EXISTS scheduled_task_runs (
          id TEXT PRIMARY KEY,
          scheduled_task_id TEXT NOT NULL,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          status TEXT DEFAULT 'running' CHECK(status IN ('running', 'success', 'failed', 'cancelled')),
          exit_code INTEGER,
          output TEXT,
          error TEXT,
          FOREIGN KEY (scheduled_task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
        )
      `);
      console.log('[DB] Created scheduled_task_runs table');

      // Create telegram_agent_links table
      database.exec(`
        CREATE TABLE IF NOT EXISTS telegram_agent_links (
          id TEXT PRIMARY KEY,
          telegram_chat_id TEXT NOT NULL UNIQUE,
          telegram_username TEXT,
          agent_id TEXT NOT NULL,
          chat_id TEXT,
          enabled INTEGER DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
          FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL
        )
      `);
      console.log('[DB] Created telegram_agent_links table');

      // Create indexes
      database.exec('CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled ON scheduled_tasks(enabled)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_scheduled_task_runs_task ON scheduled_task_runs(scheduled_task_id)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_telegram_links_chat ON telegram_agent_links(telegram_chat_id)');
      console.log('[DB] Created indexes for scheduled_tasks and telegram');

      // Set schema version directly
      const timestamp = now();
      const setStmt = database.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
      `);
      setStmt.run('schema_version', '4', timestamp, '4', timestamp);
      console.log('[DB] Migration 4 completed successfully');
    } catch (error) {
      console.error('[DB] Migration 4 failed:', error);
      // Don't throw - let app continue with potentially partial migration
    }
  }

  // Migration 5: Allow workspace-less chats (Global Chats) (v5)
  if (currentVersion < 5) {
    console.log('[DB] Running migration 5: Allow workspace-less chats');

    try {
      // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
      // First, create new table with nullable workspace_id
      database.exec(`
        CREATE TABLE IF NOT EXISTS chats_new (
          id TEXT PRIMARY KEY,
          workspace_id TEXT,
          agent_id TEXT NOT NULL,
          title TEXT,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
          is_flagged INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );

        -- Copy data from old table
        INSERT INTO chats_new (id, workspace_id, agent_id, title, status, is_flagged, created_at, updated_at)
        SELECT id, workspace_id, agent_id, title,
               COALESCE(status, 'active'),
               COALESCE(is_flagged, 0),
               created_at, updated_at
        FROM chats;

        -- Drop old table and rename new one
        DROP TABLE chats;
        ALTER TABLE chats_new RENAME TO chats;

        -- Recreate index
        CREATE INDEX IF NOT EXISTS idx_chats_workspace ON chats(workspace_id);
        CREATE INDEX IF NOT EXISTS idx_chats_agent ON chats(agent_id);
      `);

      // Update schema version
      const timestamp = now();
      const setStmt = database.prepare(`
        INSERT INTO settings (key, value, created_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
      `);
      setStmt.run('schema_version', '5', timestamp, '5', timestamp);
      console.log('[DB] Migration 5 completed successfully');
    } catch (error) {
      console.error('[DB] Migration 5 failed:', error);
      // Don't throw - let app continue with potentially partial migration
    }
  }

  // Migration 6: Knowledge Store + Agent Scheduler Extension (v6)
  if (currentVersion < 6) {
    console.log('[DB] Running migration 6: Knowledge Store + Agent Scheduler');

    try {
      // Create knowledge_entries table
      database.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_entries (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          agent_id TEXT,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          source TEXT,
          confidence INTEGER DEFAULT 50,
          tags TEXT,
          expires_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        )
      `);
      console.log('[DB] Created knowledge_entries table');

      // Create knowledge_learnings table
      database.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_learnings (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          agent_id TEXT,
          trigger TEXT NOT NULL,
          lesson TEXT NOT NULL,
          action TEXT NOT NULL,
          success_count INTEGER DEFAULT 0,
          failure_count INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        )
      `);
      console.log('[DB] Created knowledge_learnings table');

      // Extend scheduled_tasks for agent execution
      const scheduledTasksInfo = database.prepare("PRAGMA table_info(scheduled_tasks)").all() as Array<{ name: string }>;
      const stColumns = scheduledTasksInfo.map(col => col.name);

      if (!stColumns.includes('type')) {
        database.exec("ALTER TABLE scheduled_tasks ADD COLUMN type TEXT DEFAULT 'command'");
        console.log('[DB] Added type column to scheduled_tasks');
      }
      if (!stColumns.includes('agent_id')) {
        database.exec('ALTER TABLE scheduled_tasks ADD COLUMN agent_id TEXT');
        console.log('[DB] Added agent_id column to scheduled_tasks');
      }
      if (!stColumns.includes('workspace_id')) {
        database.exec('ALTER TABLE scheduled_tasks ADD COLUMN workspace_id TEXT');
        console.log('[DB] Added workspace_id column to scheduled_tasks');
      }

      // Create indexes
      database.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_entries_workspace ON knowledge_entries(workspace_id)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_entries_category ON knowledge_entries(category)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_entries_agent ON knowledge_entries(agent_id)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_learnings_workspace ON knowledge_learnings(workspace_id)');
      database.exec('CREATE INDEX IF NOT EXISTS idx_knowledge_learnings_agent ON knowledge_learnings(agent_id)');
      console.log('[DB] Created knowledge indexes');

      // Set schema version
      const timestamp = now();
      const setStmt = database.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
      `);
      setStmt.run('schema_version', '6', timestamp, '6', timestamp);
      console.log('[DB] Migration 6 completed successfully');
    } catch (error) {
      console.error('[DB] Migration 6 failed:', error);
    }
  }

  console.log('[DB] All migrations completed');
}

/**
 * Initialize the SQLite database
 */
export function initDatabase(): Database.Database {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'agent-spaces.db');

  console.log('[DB] Initializing database at:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Execute embedded schema
  db.exec(SCHEMA);

  // Run migrations
  runMigrations(db);

  console.log('[DB] Database initialized successfully');

  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[DB] Database closed');
  }
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

// ===== Workspace Operations =====

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  folder_path?: string;
  created_at: string;
  updated_at: string;
}

export function createWorkspace(data: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>): Workspace {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO workspaces (id, name, description, folder_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.name, data.description, data.folder_path, timestamp, timestamp);

  return { id, ...data, created_at: timestamp, updated_at: timestamp };
}

export function getWorkspaces(): Workspace[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM workspaces ORDER BY updated_at DESC');
  return stmt.all() as Workspace[];
}

export function getWorkspace(id: string): Workspace | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM workspaces WHERE id = ?');
  return stmt.get(id) as Workspace | null;
}

export function deleteWorkspace(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM workspaces WHERE id = ?');
  stmt.run(id);
}

export function updateWorkspace(
  id: string,
  updates: Partial<Pick<Workspace, 'name' | 'description' | 'folder_path'>>
): Workspace | null {
  const db = getDatabase();
  const timestamp = now();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.folder_path !== undefined) {
    fields.push('folder_path = ?');
    values.push(updates.folder_path);
  }

  if (fields.length === 0) {
    return getWorkspace(id);
  }

  fields.push('updated_at = ?');
  values.push(timestamp);
  values.push(id);

  const stmt = db.prepare(`UPDATE workspaces SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getWorkspace(id);
}

// ===== Agent Operations =====

export interface Agent {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  avatar?: string;
  system_prompt?: string;
  model: string;
  thinking_enabled: number;
  parent_agent_id?: string;
  config?: string; // JSON string
  created_at: string;
}

export function createAgent(data: Omit<Agent, 'id' | 'created_at'>): Agent {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO agents (id, workspace_id, name, description, avatar, system_prompt, model, thinking_enabled, parent_agent_id, config, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.workspace_id,
    data.name,
    data.description,
    data.avatar,
    data.system_prompt,
    data.model || 'claude-sonnet-4.5',
    data.thinking_enabled || 0,
    data.parent_agent_id,
    data.config,
    timestamp
  );

  return { id, ...data, created_at: timestamp };
}

export function getAgents(workspaceId: string): Agent[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM agents WHERE workspace_id = ? ORDER BY created_at DESC');
  return stmt.all(workspaceId) as Agent[];
}

export function getAgent(id: string): Agent | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM agents WHERE id = ?');
  return stmt.get(id) as Agent | null;
}

export function updateAgent(id: string, data: Partial<Omit<Agent, 'id' | 'created_at'>>): void {
  const db = getDatabase();
  const fields = Object.keys(data);
  const values = Object.values(data);

  if (fields.length === 0) return;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const stmt = db.prepare(`UPDATE agents SET ${setClause} WHERE id = ?`);
  stmt.run(...values, id);
}

export function deleteAgent(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM agents WHERE id = ?');
  stmt.run(id);
}

export function getGlobalAgents(): Agent[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM agents WHERE workspace_id IS NULL ORDER BY created_at DESC');
  return stmt.all() as Agent[];
}

export function moveAgentToWorkspace(agentId: string, workspaceId: string | null): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE agents SET workspace_id = ? WHERE id = ?');
  stmt.run(workspaceId, agentId);
}

// ===== Chat Operations =====

export interface Chat {
  id: string;
  workspace_id: string;
  agent_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export function createChat(data: Omit<Chat, 'id' | 'created_at' | 'updated_at'> & { workspace_id?: string | null }): Chat {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO chats (id, workspace_id, agent_id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Allow null workspace_id for global chats
  stmt.run(id, data.workspace_id || null, data.agent_id, data.title, timestamp, timestamp);

  return { id, workspace_id: data.workspace_id || null, agent_id: data.agent_id, title: data.title, created_at: timestamp, updated_at: timestamp } as Chat;
}

export function getChats(workspaceId: string): Chat[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM chats WHERE workspace_id = ? ORDER BY updated_at DESC');
  return stmt.all(workspaceId) as Chat[];
}

export function getGlobalChats(): Chat[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM chats WHERE workspace_id IS NULL ORDER BY updated_at DESC');
  return stmt.all() as Chat[];
}

export function getAllChats(): Chat[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM chats ORDER BY updated_at DESC');
  return stmt.all() as Chat[];
}

export function getChat(id: string): Chat | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM chats WHERE id = ?');
  return stmt.get(id) as Chat | null;
}

export function updateChatTimestamp(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?');
  stmt.run(now(), id);
}

export function deleteChat(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM chats WHERE id = ?');
  stmt.run(id);
}

export function updateChat(id: string, data: Partial<Pick<Chat, 'title'>>): void {
  const db = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) {
    updates.push('title = ?');
    values.push(data.title);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  values.push(now());
  values.push(id);

  const stmt = db.prepare(`UPDATE chats SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

// ===== Message Operations =====

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: string; // JSON string
  thinking_content?: string;
  created_at: string;
}

export function createMessage(data: Omit<Message, 'id' | 'created_at'>): Message {
  console.log('[DB] createMessage called with:', { chat_id: data.chat_id, role: data.role, content_length: data.content?.length });

  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  try {
    const stmt = db.prepare(`
      INSERT INTO messages (id, chat_id, role, content, attachments, thinking_content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(id, data.chat_id, data.role, data.content, data.attachments, data.thinking_content, timestamp);
    console.log('[DB] Message inserted successfully:', { id, changes: result.changes });

    // Update chat timestamp
    updateChatTimestamp(data.chat_id);

    // Verify the message was saved
    const verifyStmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE id = ?');
    const verify = verifyStmt.get(id) as { count: number };
    console.log('[DB] Message verification:', verify);

    return { id, ...data, created_at: timestamp };
  } catch (error) {
    console.error('[DB] createMessage FAILED:', error);
    throw error;
  }
}

export function getMessages(chatId: string): Message[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC');
  return stmt.all(chatId) as Message[];
}

// ===== Settings Operations =====

export function getSetting(key: string): string | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const result = stmt.get(key) as { value: string } | undefined;
  return result?.value || null;
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
  `);
  const timestamp = now();
  stmt.run(key, value, timestamp, value, timestamp);
}

export function getAllSettings(): Record<string, string> {
  const db = getDatabase();
  const stmt = db.prepare('SELECT key, value FROM settings');
  const rows = stmt.all() as { key: string; value: string }[];
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
}

// ===== Skill Operations =====

export interface Skill {
  id: string;
  workspace_id?: string;
  name: string;
  description?: string;
  type: 'mcp' | 'function' | 'script';
  config: string; // JSON string
  created_at: string;
}

export function createSkill(data: Omit<Skill, 'id' | 'created_at'>): Skill {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO skills (id, workspace_id, name, description, type, config, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.workspace_id, data.name, data.description, data.type, data.config, timestamp);

  return { id, ...data, created_at: timestamp };
}

export function getSkills(workspaceId?: string): Skill[] {
  const db = getDatabase();
  let stmt;

  if (workspaceId) {
    stmt = db.prepare('SELECT * FROM skills WHERE workspace_id = ? OR workspace_id IS NULL ORDER BY created_at DESC');
    return stmt.all(workspaceId) as Skill[];
  } else {
    stmt = db.prepare('SELECT * FROM skills WHERE workspace_id IS NULL ORDER BY created_at DESC');
    return stmt.all() as Skill[];
  }
}

// ===== MCP Server Operations =====

export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string; // JSON string
  env?: string; // JSON string
  workspace_id?: string;
  enabled: number;
  created_at: string;
}

export function createMCPServer(data: Omit<MCPServer, 'id' | 'created_at'>): MCPServer {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO mcp_servers (id, name, command, args, env, workspace_id, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.name,
    data.command,
    data.args,
    data.env,
    data.workspace_id,
    data.enabled ?? 1,
    timestamp
  );

  return { id, ...data, created_at: timestamp };
}

export function getMCPServers(workspaceId?: string): MCPServer[] {
  const db = getDatabase();
  let stmt;

  if (workspaceId) {
    stmt = db.prepare('SELECT * FROM mcp_servers WHERE workspace_id = ? OR workspace_id IS NULL ORDER BY created_at DESC');
    return stmt.all(workspaceId) as MCPServer[];
  } else {
    stmt = db.prepare('SELECT * FROM mcp_servers WHERE workspace_id IS NULL ORDER BY created_at DESC');
    return stmt.all() as MCPServer[];
  }
}

export function updateSkill(id: string, data: Partial<Omit<Skill, 'id' | 'created_at'>>): void {
  const db = getDatabase();
  const fields = Object.keys(data);
  const values = Object.values(data);

  if (fields.length === 0) return;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const stmt = db.prepare(`UPDATE skills SET ${setClause} WHERE id = ?`);
  stmt.run(...values, id);
}

export function deleteSkill(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM skills WHERE id = ?');
  stmt.run(id);
}

export function assignSkillToAgent(agentId: string, skillId: string): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO agent_skills (agent_id, skill_id)
    VALUES (?, ?)
  `);
  stmt.run(agentId, skillId);
}

export function unassignSkillFromAgent(agentId: string, skillId: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM agent_skills WHERE agent_id = ? AND skill_id = ?');
  stmt.run(agentId, skillId);
}

export function getAgentSkills(agentId: string): Skill[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT s.* FROM skills s
    JOIN agent_skills as_table ON as_table.skill_id = s.id
    WHERE as_table.agent_id = ?
    ORDER BY s.created_at DESC
  `);
  return stmt.all(agentId) as Skill[];
}

export function updateMCPServer(id: string, data: Partial<Omit<MCPServer, 'id' | 'created_at'>>): void {
  const db = getDatabase();
  const fields = Object.keys(data);
  const values = Object.values(data);

  if (fields.length === 0) return;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const stmt = db.prepare(`UPDATE mcp_servers SET ${setClause} WHERE id = ?`);
  stmt.run(...values, id);
}

export function deleteMCPServer(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM mcp_servers WHERE id = ?');
  stmt.run(id);
}

export function toggleMCPServer(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE mcp_servers SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?');
  stmt.run(id);
}

export function getMCPServer(id: string): MCPServer | undefined {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM mcp_servers WHERE id = ?');
  return stmt.get(id) as MCPServer | undefined;
}

export function getGlobalSkills(): Skill[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM skills WHERE workspace_id IS NULL ORDER BY created_at DESC');
  return stmt.all() as Skill[];
}

export function getGlobalMCPServers(): MCPServer[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM mcp_servers WHERE workspace_id IS NULL ORDER BY created_at DESC');
  return stmt.all() as MCPServer[];
}

export function deleteSetting(key: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM settings WHERE key = ?');
  stmt.run(key);
}

// ===== Hook Operations =====

export interface Hook {
  id: string;
  workspace_id: string;
  name: string;
  event: string;
  condition?: string;
  action: string;
  action_config: string; // JSON string
  enabled: number;
  created_at: string;
}

export function createHook(data: Omit<Hook, 'id' | 'created_at'>): Hook {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO hooks (id, workspace_id, name, event, condition, action, action_config, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.workspace_id,
    data.name,
    data.event,
    data.condition,
    data.action,
    data.action_config,
    data.enabled ?? 1,
    timestamp
  );

  return { id, ...data, created_at: timestamp };
}

export function getHooks(workspaceId: string): Hook[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM hooks WHERE workspace_id = ? ORDER BY created_at DESC');
  return stmt.all(workspaceId) as Hook[];
}

export function updateHook(id: string, data: Partial<Omit<Hook, 'id' | 'created_at'>>): void {
  const db = getDatabase();
  const fields = Object.keys(data);
  const values = Object.values(data);

  if (fields.length === 0) return;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const stmt = db.prepare(`UPDATE hooks SET ${setClause} WHERE id = ?`);
  stmt.run(...values, id);
}

export function deleteHook(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM hooks WHERE id = ?');
  stmt.run(id);
}

export function toggleHook(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE hooks SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?');
  stmt.run(id);
}

// ===== Default Agent Operations =====

export function getOrCreateDefaultAgent(): Agent {
  const db = getDatabase();
  const defaultWorkspaceId = '__default__';
  const defaultAgentId = '__default_agent__';

  // Check if default workspace exists
  let workspace = getWorkspace(defaultWorkspaceId);
  if (!workspace) {
    // Create default workspace
    const timestamp = now();
    const insertWorkspaceStmt = db.prepare(`
      INSERT INTO workspaces (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertWorkspaceStmt.run(
      defaultWorkspaceId,
      'Default Workspace',
      'Built-in workspace for the default agent',
      timestamp,
      timestamp
    );
    workspace = getWorkspace(defaultWorkspaceId)!;
  }

  // Check if default agent exists
  let agent = getAgent(defaultAgentId);
  if (!agent) {
    // Create default agent
    const timestamp = now();
    const insertAgentStmt = db.prepare(`
      INSERT INTO agents (id, workspace_id, name, description, model, thinking_enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAgentStmt.run(
      defaultAgentId,
      defaultWorkspaceId,
      'Claude',
      'Your default AI assistant with full capabilities',
      'claude-sonnet-4.5',
      0,
      timestamp
    );
    agent = getAgent(defaultAgentId)!;
  }

  return agent;
}

// ===== Permission Memory Operations =====

export interface PermissionMemory {
  id: string;
  workspace_id: string;
  agent_id?: string;
  category: 'bash' | 'git' | 'file_write' | 'file_read' | 'network' | 'mcp';
  operation_pattern: string;
  decision: 'allow' | 'deny';
  created_at: string;
}

export function createPermissionMemory(data: Omit<PermissionMemory, 'id' | 'created_at'>): PermissionMemory {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO permission_memory (id, workspace_id, agent_id, category, operation_pattern, decision, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, data.workspace_id, data.agent_id, data.category, data.operation_pattern, data.decision, timestamp);

  return { id, ...data, created_at: timestamp };
}

export function getPermissionMemory(workspaceId: string, agentId?: string): PermissionMemory[] {
  const db = getDatabase();
  let stmt;

  if (agentId) {
    stmt = db.prepare('SELECT * FROM permission_memory WHERE workspace_id = ? AND (agent_id = ? OR agent_id IS NULL) ORDER BY created_at DESC');
    return stmt.all(workspaceId, agentId) as PermissionMemory[];
  } else {
    stmt = db.prepare('SELECT * FROM permission_memory WHERE workspace_id = ? AND agent_id IS NULL ORDER BY created_at DESC');
    return stmt.all(workspaceId) as PermissionMemory[];
  }
}

export function deletePermissionMemory(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM permission_memory WHERE id = ?');
  stmt.run(id);
}

export function clearPermissionMemory(workspaceId: string, agentId?: string): void {
  const db = getDatabase();
  let stmt;

  if (agentId) {
    stmt = db.prepare('DELETE FROM permission_memory WHERE workspace_id = ? AND agent_id = ?');
    stmt.run(workspaceId, agentId);
  } else {
    stmt = db.prepare('DELETE FROM permission_memory WHERE workspace_id = ? AND agent_id IS NULL');
    stmt.run(workspaceId);
  }
}

// ===== Chat Status Operations =====

export function updateChatStatus(chatId: string, status: string): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE chats SET status = ?, updated_at = ? WHERE id = ?');
  stmt.run(status, now(), chatId);
}

export function toggleChatFlag(chatId: string): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE chats SET is_flagged = CASE WHEN is_flagged = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?');
  stmt.run(now(), chatId);
}

export function getChatsByStatus(workspaceId: string, status: string): Chat[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM chats WHERE workspace_id = ? AND status = ? ORDER BY updated_at DESC');
  return stmt.all(workspaceId, status) as Chat[];
}

export function getFlaggedChats(workspaceId: string): Chat[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM chats WHERE workspace_id = ? AND is_flagged = 1 ORDER BY updated_at DESC');
  return stmt.all(workspaceId) as Chat[];
}

export function updateWorkspacePermissionMode(workspaceId: string, mode: string): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE workspaces SET permission_mode = ? WHERE id = ?');
  stmt.run(mode, workspaceId);
}

export function updateAgentPermissionMode(agentId: string, mode: string | null): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE agents SET permission_mode = ? WHERE id = ?');
  stmt.run(mode, agentId);
}

// ===== Personal Task Management =====

import type { PersonalTask } from '../../src/lib/types';

export function createPersonalTask(data: Omit<PersonalTask, 'id' | 'created_at'>): PersonalTask {
  const db = getDatabase();
  const id = `ptask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = now();

  const stmt = db.prepare(`
    INSERT INTO personal_tasks (
      id, title, description, status, priority,
      due_date, created_at, workspace_id, tags, notes,
      created_by_agent_id, last_modified_by_agent_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.title,
    data.description || null,
    data.status || 'todo',
    data.priority || 'medium',
    data.due_date || null,
    createdAt,
    data.workspace_id || null,
    data.tags || null,
    data.notes || null,
    data.created_by_agent_id || null,
    data.last_modified_by_agent_id || null
  );

  return getPersonalTask(id)!;
}

export function getAllPersonalTasks(filters?: {
  status?: string;
  workspace_id?: string;
  priority?: string;
}): PersonalTask[] {
  const db = getDatabase();
  let query = 'SELECT * FROM personal_tasks WHERE 1=1';
  const params: any[] = [];

  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.workspace_id) {
    query += ' AND workspace_id = ?';
    params.push(filters.workspace_id);
  }
  if (filters?.priority) {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params) as PersonalTask[];
}

export function getPersonalTask(id: string): PersonalTask | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM personal_tasks WHERE id = ?');
  return stmt.get(id) as PersonalTask | null;
}

export function updatePersonalTask(id: string, updates: Partial<PersonalTask>): PersonalTask {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  // Build update query dynamically
  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'created_at' && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length > 0) {
    values.push(id);
    const stmt = db.prepare(`UPDATE personal_tasks SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  return getPersonalTask(id)!;
}

export function updatePersonalTaskStatus(
  id: string,
  status: PersonalTask['status'],
  agentId?: string
): PersonalTask {
  const updates: Partial<PersonalTask> = { status };

  if (status === 'completed' && !updates.completed_at) {
    updates.completed_at = now();
  } else if (status === 'working' && !updates.started_at) {
    updates.started_at = now();
  }

  if (agentId) {
    updates.last_modified_by_agent_id = agentId;
  }

  return updatePersonalTask(id, updates);
}

export function deletePersonalTask(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM personal_tasks WHERE id = ?');
  stmt.run(id);
}

export function getPersonalTaskStats(): {
  total: number;
  todo: number;
  working: number;
  review: number;
  completed: number;
  overdue: number;
  dueToday: number;
} {
  const allTasks = getAllPersonalTasks();
  const today = new Date().toISOString().split('T')[0];
  const nowDate = new Date();

  const stats = {
    total: allTasks.length,
    todo: 0,
    working: 0,
    review: 0,
    completed: 0,
    overdue: 0,
    dueToday: 0
  };

  allTasks.forEach(task => {
    // Count by status
    if (task.status === 'todo') stats.todo++;
    else if (task.status === 'working') stats.working++;
    else if (task.status === 'review') stats.review++;
    else if (task.status === 'completed') stats.completed++;

    // Check due dates
    if (task.due_date && task.status !== 'completed') {
      const dueDate = new Date(task.due_date);
      if (dueDate < nowDate) {
        stats.overdue++;
      } else if (task.due_date === today) {
        stats.dueToday++;
      }
    }
  });

  return stats;
}

// ===== Canvas Operations =====

export interface SavedCanvas {
  id: string;
  workspace_id: string | null;
  name: string;
  thumbnail: string | null;
  data: string; // JSON stringified
  created_at: string;
  updated_at: string;
}

export function canvasSave(
  id: string,
  workspaceId: string | null,
  name: string,
  data: string,
  thumbnail: string | null
): SavedCanvas {
  const db = getDatabase();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO canvases (id, workspace_id, name, data, thumbnail, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      data = excluded.data,
      thumbnail = excluded.thumbnail,
      updated_at = excluded.updated_at
  `);

  stmt.run(id, workspaceId, name, data, thumbnail, timestamp, timestamp);

  return canvasGet(id)!;
}

export function canvasList(workspaceId: string | null): SavedCanvas[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT id, workspace_id, name, thumbnail, created_at, updated_at
    FROM canvases
    WHERE workspace_id IS ? OR workspace_id = ?
    ORDER BY updated_at DESC
  `);
  return stmt.all(workspaceId, workspaceId) as SavedCanvas[];
}

export function canvasGet(id: string): SavedCanvas | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM canvases WHERE id = ?');
  return stmt.get(id) as SavedCanvas | null;
}

export function canvasDelete(id: string): { success: boolean } {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM canvases WHERE id = ?');
  stmt.run(id);
  return { success: true };
}

// ===== Scheduled Task Operations =====

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  cron_expression: string;
  command: string;
  working_directory?: string;
  type?: string;              // 'command' | 'agent'
  agent_id?: string;
  workspace_id?: string;
  enabled: number;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTaskRun {
  id: string;
  scheduled_task_id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  exit_code?: number;
  output?: string;
  error?: string;
}

export function createScheduledTask(data: Omit<ScheduledTask, 'id' | 'created_at' | 'updated_at'>): ScheduledTask {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO scheduled_tasks (id, name, description, cron_expression, command, working_directory, enabled, next_run_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.name,
    data.description || null,
    data.cron_expression,
    data.command,
    data.working_directory || null,
    data.enabled ?? 1,
    data.next_run_at || null,
    timestamp,
    timestamp
  );

  return getScheduledTask(id)!;
}

export function getScheduledTasks(): ScheduledTask[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM scheduled_tasks ORDER BY created_at DESC');
  return stmt.all() as ScheduledTask[];
}

export function getEnabledScheduledTasks(): ScheduledTask[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM scheduled_tasks WHERE enabled = 1 ORDER BY created_at DESC');
  return stmt.all() as ScheduledTask[];
}

export function getScheduledTask(id: string): ScheduledTask | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?');
  return stmt.get(id) as ScheduledTask | null;
}

export function updateScheduledTask(id: string, data: Partial<Omit<ScheduledTask, 'id' | 'created_at'>>): ScheduledTask {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'created_at' && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now());
    values.push(id);

    const stmt = db.prepare(`UPDATE scheduled_tasks SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  return getScheduledTask(id)!;
}

export function deleteScheduledTask(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM scheduled_tasks WHERE id = ?');
  stmt.run(id);
}

export function toggleScheduledTask(id: string): ScheduledTask {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE scheduled_tasks SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?');
  stmt.run(now(), id);
  return getScheduledTask(id)!;
}

export function createScheduledTaskRun(data: Omit<ScheduledTaskRun, 'id'>): ScheduledTaskRun {
  const db = getDatabase();
  const id = generateId();

  const stmt = db.prepare(`
    INSERT INTO scheduled_task_runs (id, scheduled_task_id, started_at, completed_at, status, exit_code, output, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.scheduled_task_id,
    data.started_at,
    data.completed_at || null,
    data.status,
    data.exit_code ?? null,
    data.output || null,
    data.error || null
  );

  return getScheduledTaskRun(id)!;
}

export function getScheduledTaskRun(id: string): ScheduledTaskRun | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM scheduled_task_runs WHERE id = ?');
  return stmt.get(id) as ScheduledTaskRun | null;
}

export function getScheduledTaskRuns(taskId: string, limit: number = 50): ScheduledTaskRun[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM scheduled_task_runs WHERE scheduled_task_id = ? ORDER BY started_at DESC LIMIT ?');
  return stmt.all(taskId, limit) as ScheduledTaskRun[];
}

export function updateScheduledTaskRun(id: string, data: Partial<Omit<ScheduledTaskRun, 'id' | 'scheduled_task_id' | 'started_at'>>): ScheduledTaskRun {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length > 0) {
    values.push(id);
    const stmt = db.prepare(`UPDATE scheduled_task_runs SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  return getScheduledTaskRun(id)!;
}

// ===== Telegram Agent Link Operations =====

export interface TelegramAgentLink {
  id: string;
  telegram_chat_id: string;
  telegram_username?: string;
  agent_id: string;
  chat_id?: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export function createTelegramAgentLink(data: Omit<TelegramAgentLink, 'id' | 'created_at' | 'updated_at'>): TelegramAgentLink {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO telegram_agent_links (id, telegram_chat_id, telegram_username, agent_id, chat_id, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.telegram_chat_id,
    data.telegram_username || null,
    data.agent_id,
    data.chat_id || null,
    data.enabled ?? 1,
    timestamp,
    timestamp
  );

  return getTelegramAgentLink(id)!;
}

export function getTelegramAgentLinks(): TelegramAgentLink[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM telegram_agent_links ORDER BY created_at DESC');
  return stmt.all() as TelegramAgentLink[];
}

export function getTelegramAgentLink(id: string): TelegramAgentLink | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM telegram_agent_links WHERE id = ?');
  return stmt.get(id) as TelegramAgentLink | null;
}

export function getTelegramAgentLinkByChatId(telegramChatId: string): TelegramAgentLink | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM telegram_agent_links WHERE telegram_chat_id = ?');
  return stmt.get(telegramChatId) as TelegramAgentLink | null;
}

export function updateTelegramAgentLink(id: string, data: Partial<Omit<TelegramAgentLink, 'id' | 'created_at'>>): TelegramAgentLink {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'created_at' && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now());
    values.push(id);

    const stmt = db.prepare(`UPDATE telegram_agent_links SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  return getTelegramAgentLink(id)!;
}

export function deleteTelegramAgentLink(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM telegram_agent_links WHERE id = ?');
  stmt.run(id);
}

export function toggleTelegramAgentLink(id: string): TelegramAgentLink {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE telegram_agent_links SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?');
  stmt.run(now(), id);
  return getTelegramAgentLink(id)!;
}

// ===== Knowledge Store Operations =====

import type { KnowledgeEntry, KnowledgeLearning } from '../../src/lib/types';

export function createKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id' | 'created_at' | 'updated_at'>): KnowledgeEntry {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO knowledge_entries (id, workspace_id, agent_id, category, title, content, source, confidence, tags, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    entry.workspace_id,
    entry.agent_id || null,
    entry.category,
    entry.title,
    entry.content,
    entry.source || null,
    entry.confidence ?? 50,
    entry.tags || null,
    entry.expires_at || null,
    timestamp,
    timestamp
  );

  return getKnowledgeEntry(id)!;
}

export function getKnowledgeEntry(id: string): KnowledgeEntry | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM knowledge_entries WHERE id = ?');
  return stmt.get(id) as KnowledgeEntry | null;
}

export function getKnowledgeEntries(workspaceId: string, filters?: {
  category?: string;
  agent_id?: string;
  limit?: number;
}): KnowledgeEntry[] {
  const db = getDatabase();
  let query = 'SELECT * FROM knowledge_entries WHERE workspace_id = ?';
  const params: any[] = [workspaceId];

  if (filters?.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters?.agent_id) {
    query += ' AND agent_id = ?';
    params.push(filters.agent_id);
  }

  // Exclude expired entries
  query += ' AND (expires_at IS NULL OR expires_at > ?)';
  params.push(now());

  query += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params) as KnowledgeEntry[];
}

export function deleteKnowledgeEntry(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM knowledge_entries WHERE id = ?');
  stmt.run(id);
}

export function createKnowledgeLearning(learning: Omit<KnowledgeLearning, 'id' | 'created_at' | 'updated_at'>): KnowledgeLearning {
  const db = getDatabase();
  const id = generateId();
  const timestamp = now();

  const stmt = db.prepare(`
    INSERT INTO knowledge_learnings (id, workspace_id, agent_id, trigger, lesson, action, success_count, failure_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    learning.workspace_id,
    learning.agent_id || null,
    learning.trigger,
    learning.lesson,
    learning.action,
    learning.success_count ?? 0,
    learning.failure_count ?? 0,
    timestamp,
    timestamp
  );

  return getKnowledgeLearning(id)!;
}

export function getKnowledgeLearning(id: string): KnowledgeLearning | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM knowledge_learnings WHERE id = ?');
  return stmt.get(id) as KnowledgeLearning | null;
}

export function getKnowledgeLearnings(workspaceId: string, agentId?: string): KnowledgeLearning[] {
  const db = getDatabase();
  let query = 'SELECT * FROM knowledge_learnings WHERE workspace_id = ?';
  const params: any[] = [workspaceId];

  if (agentId) {
    query += ' AND agent_id = ?';
    params.push(agentId);
  }

  query += ' ORDER BY updated_at DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params) as KnowledgeLearning[];
}

export function updateKnowledgeLearning(id: string, updates: Partial<Pick<KnowledgeLearning, 'success_count' | 'failure_count' | 'lesson' | 'action'>>): KnowledgeLearning {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now());
    values.push(id);

    const stmt = db.prepare(`UPDATE knowledge_learnings SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  return getKnowledgeLearning(id)!;
}

export function getKnowledgeForAgent(workspaceId: string, categories?: string[], limit: number = 20): KnowledgeEntry[] {
  const db = getDatabase();
  let query = 'SELECT * FROM knowledge_entries WHERE workspace_id = ?';
  const params: any[] = [workspaceId];

  // Exclude expired entries
  query += ' AND (expires_at IS NULL OR expires_at > ?)';
  params.push(now());

  if (categories && categories.length > 0) {
    const placeholders = categories.map(() => '?').join(', ');
    query += ` AND category IN (${placeholders})`;
    params.push(...categories);
  }

  query += ' ORDER BY confidence DESC, created_at DESC LIMIT ?';
  params.push(limit);

  const stmt = db.prepare(query);
  return stmt.all(...params) as KnowledgeEntry[];
}

// ===== Footy Lab Agent Seeding =====

export function seedFootyLabAgents(workspaceId: string): void {
  const db = getDatabase();

  // Check if agents already exist for this workspace with footy-lab-swarm category
  const existing = db.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE workspace_id = ? AND category = 'footy-lab-swarm'"
  ).get(workspaceId) as { count: number };

  if (existing.count > 0) {
    console.log('[DB] Footy Lab agents already seeded for workspace:', workspaceId);
    return;
  }

  console.log('[DB] Seeding Footy Lab agents for workspace:', workspaceId);
  const timestamp = now();

  const agents = [
    {
      name: 'Footy Lab Listener',
      description: 'Reddit/forum intelligence gatherer for Footy Lab. Scans soccer communities for pain points, trending topics, and engagement opportunities.',
      category: 'footy-lab-swarm',
      model: 'claude-sonnet-4.5',
      system_prompt: `You are the Footy Lab Listener — an intelligence-gathering agent that monitors Reddit and soccer forums for actionable insights.

## Your Mission
Scan soccer communities to identify:
- Training frustrations and pain points players express
- Gear questions and product discussions
- Coaching methodology debates
- "How do I improve?" posts and common struggles
- Trending topics and viral discussions

## Target Communities
- r/bootroom (soccer training & improvement)
- r/soccer (general soccer discussion)
- r/footballtactics (tactical analysis)
- r/soccercoaching (coaching strategies)

## Reddit Playbook Strategy
- Act like a normal, helpful community member — NOT a marketer
- 95% pure value, 5% product mention (only when genuinely relevant)
- Study what types of posts get engagement vs. ignored
- Track recurring questions that indicate market gaps

## Output Format
For each finding, output a structured block:

---KNOWLEDGE_ENTRY---
category: [competitor_intel | community_pain_point | trending_topic | content_idea | engagement_insight]
title: [Brief descriptive title]
content: [Detailed description of the finding]
source: [URL or "r/subreddit - post title"]
confidence: [0-100, how confident you are this is actionable]
tags: ["tag1", "tag2", "tag3"]
---END_ENTRY---

When you discover new patterns about what works or doesn't work, output:

---LEARNING---
trigger: [What situation you encountered]
lesson: [What you learned from it]
action: [What to do differently next time]
---END_LEARNING---

## Guidelines
- Focus on QUALITY over quantity — 5 great insights beat 20 mediocre ones
- Include specific quotes or data points when possible
- Rate confidence honestly — speculation should be low confidence
- Tag entries for easy retrieval by other agents
- Note the engagement level (upvotes, comments) of posts you're analyzing`,
    },
    {
      name: 'Footy Lab Scout',
      description: 'Competitor researcher scanning soccer training apps, gear brands, and coaching platforms.',
      category: 'footy-lab-swarm',
      model: 'claude-sonnet-4.5',
      system_prompt: `You are the Footy Lab Scout — a competitive intelligence agent that researches soccer training apps, gear brands, and coaching platforms.

## Your Mission
Monitor and analyze competitors in the soccer training/gear space to identify opportunities, threats, and market gaps.

## Focus Areas
- Soccer training apps (pricing, features, user reviews)
- Gear brands (product launches, marketing strategies)
- Coaching platforms (content, positioning, audience)
- Market trends and emerging players

## Output Format
Use ---KNOWLEDGE_ENTRY--- blocks with category "competitor_intel" for findings.
Use ---LEARNING--- blocks for strategic insights.`,
    },
    {
      name: 'Footy Lab Spotter',
      description: 'Social media scanner for soccer content trends on Twitter/X, TikTok, and Instagram.',
      category: 'footy-lab-swarm',
      model: 'claude-sonnet-4.5',
      system_prompt: `You are the Footy Lab Spotter — a social media trend scanner that identifies viral soccer content and emerging formats.

## Your Mission
Track soccer content trends across social platforms to inform Footy Lab's content strategy.

## Platforms
- Twitter/X (soccer discussions, viral clips)
- TikTok (training videos, soccer lifestyle content)
- Instagram (gear showcases, training reels)

## Output Format
Use ---KNOWLEDGE_ENTRY--- blocks with category "trending_topic" or "content_idea" for findings.
Use ---LEARNING--- blocks for pattern observations.`,
    },
    {
      name: 'Footy Lab Writer',
      description: 'Content creator that uses the knowledge store to write Reddit posts, comments, and articles.',
      category: 'footy-lab-swarm',
      model: 'claude-sonnet-4.5',
      system_prompt: `You are the Footy Lab Writer — a content creation agent that produces authentic, valuable soccer content.

## Your Mission
Using intelligence from the knowledge store, create content that provides genuine value to soccer communities while subtly positioning Footy Lab.

## Content Types
- Reddit posts and comments (authentic, helpful tone)
- Blog articles and guides
- Social media content drafts

## Reddit Playbook
- 95% value, 5% product (only when genuinely helpful)
- Match the tone and style of each subreddit
- Provide actionable advice backed by real knowledge

## Output Format
Use ---KNOWLEDGE_ENTRY--- blocks with category "content_idea" for drafted content.`,
    },
    {
      name: 'Footy Lab Editor',
      description: 'Quality gate that reviews Writer output for tone, accuracy, and Reddit playbook compliance.',
      category: 'footy-lab-swarm',
      model: 'claude-sonnet-4.5',
      system_prompt: `You are the Footy Lab Editor — a quality control agent that reviews content before publication.

## Your Mission
Review content from the Writer agent for:
- Tone authenticity (does it sound like a real community member?)
- Accuracy of soccer knowledge
- Reddit playbook compliance (not too promotional)
- Engagement potential

## Output Format
Use ---KNOWLEDGE_ENTRY--- blocks with category "engagement_insight" for review findings.
Use ---LEARNING--- blocks for editorial pattern observations.`,
    },
    {
      name: 'Footy Lab Orchestrator',
      description: 'Coordinates the swarm, decides priorities, and triggers other agents based on knowledge store state.',
      category: 'footy-lab-swarm',
      model: 'claude-sonnet-4.5',
      system_prompt: `You are the Footy Lab Orchestrator — the coordination agent that manages the Footy Lab agent swarm.

## Your Mission
- Review the knowledge store for completeness and freshness
- Decide which agents need to run and in what order
- Identify gaps in intelligence coverage
- Prioritize actions based on business impact

## Output Format
Use ---KNOWLEDGE_ENTRY--- blocks to log coordination decisions.
Use ---LEARNING--- blocks for workflow optimization insights.`,
    },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO agents (id, workspace_id, name, description, category, system_prompt, model, thinking_enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const agent of agents) {
    const id = generateId();
    insertStmt.run(
      id,
      workspaceId,
      agent.name,
      agent.description,
      agent.category,
      agent.system_prompt,
      agent.model,
      0,
      timestamp
    );
    console.log(`[DB] Created Footy Lab agent: ${agent.name} (${id})`);
  }

  console.log('[DB] Footy Lab agents seeded successfully');
}
