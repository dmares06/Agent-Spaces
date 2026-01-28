import type Database from 'better-sqlite3';

/**
 * Migration: Add category columns to agents, skills, and mcp_servers tables
 *
 * This migration:
 * 1. Adds explicit category columns to agents, skills, and mcp_servers
 * 2. Migrates existing agent categories from config JSON to the new column
 * 3. Creates indexes for better query performance
 */
export function migrateToCategories(db: Database.Database) {
  console.log('[Migration 001] Adding category columns...');

  // Check if migration already applied
  const schemaVersion = db.prepare(`SELECT value FROM settings WHERE key = 'schema_version'`).get() as { value: string } | undefined;
  if (schemaVersion && parseInt(schemaVersion.value) >= 1) {
    console.log('[Migration 001] Already applied, skipping');
    return;
  }

  // 1. Add category column to agents table
  try {
    db.exec(`ALTER TABLE agents ADD COLUMN category TEXT DEFAULT NULL`);
    console.log('[Migration 001] Added category column to agents table');
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
    console.log('[Migration 001] Category column already exists in agents table');
  }

  // 2. Add category column to skills table
  try {
    db.exec(`ALTER TABLE skills ADD COLUMN category TEXT DEFAULT NULL`);
    console.log('[Migration 001] Added category column to skills table');
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
    console.log('[Migration 001] Category column already exists in skills table');
  }

  // 3. Add category column to mcp_servers table
  try {
    db.exec(`ALTER TABLE mcp_servers ADD COLUMN category TEXT DEFAULT NULL`);
    console.log('[Migration 001] Added category column to mcp_servers table');
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
    console.log('[Migration 001] Category column already exists in mcp_servers table');
  }

  // 4. Migrate existing agent categories from config JSON
  const agents = db.prepare(`SELECT id, config FROM agents WHERE config IS NOT NULL`).all() as Array<{ id: string; config: string }>;
  let migratedCount = 0;

  for (const agent of agents) {
    try {
      const config = JSON.parse(agent.config || '{}');
      if (config.category && typeof config.category === 'string') {
        db.prepare(`UPDATE agents SET category = ? WHERE id = ?`).run(config.category, agent.id);
        migratedCount++;
      }
    } catch (error) {
      console.error('[Migration 001] Failed to migrate agent category:', agent.id, error);
    }
  }

  console.log(`[Migration 001] Migrated ${migratedCount} agent categories from config JSON`);

  // 5. Create indexes for better query performance
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_mcp_servers_category ON mcp_servers(category)`);
    console.log('[Migration 001] Created category indexes');
  } catch (error) {
    console.error('[Migration 001] Failed to create indexes:', error);
  }

  // 6. Set schema version
  db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES ('schema_version', '1', datetime('now'))
  `).run();

  console.log('[Migration 001] Migration complete!');
}

/**
 * Rollback function (for development/testing)
 * Note: SQLite doesn't support DROP COLUMN, so this is a placeholder
 */
export function rollbackCategories(db: Database.Database) {
  console.log('[Migration 001 Rollback] Note: SQLite does not support DROP COLUMN');
  console.log('[Migration 001 Rollback] To rollback, you must recreate tables without category column');

  // Reset schema version
  db.prepare(`UPDATE settings SET value = '0' WHERE key = 'schema_version'`).run();
}
