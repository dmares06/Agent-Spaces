import fs from 'fs';
import path from 'path';

export interface AgentDefinition {
  name: string;
  description?: string;
  system_prompt?: string;
  avatar?: string;
  model?: string;
  thinking_enabled?: boolean;
  category?: string;
}

export interface SkillDefinition {
  name: string;
  description?: string;
  type: 'mcp' | 'function' | 'script';
  config: any;
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface ScanResult {
  agents: AgentDefinition[];
  skills: SkillDefinition[];
  mcpServers: MCPServerConfig[];
}

/**
 * Scan MO_Workflow folder structure and extract agents, skills, and MCP configs
 */
export async function scanWorkflowFolder(folderPath: string): Promise<ScanResult> {
  console.log('[Scanner] Scanning folder:', folderPath);

  const result: ScanResult = {
    agents: [],
    skills: [],
    mcpServers: [],
  };

  try {
    // 1. Scan /agents folder for agent definitions
    const agentsPath = path.join(folderPath, 'agents');
    if (fs.existsSync(agentsPath)) {
      result.agents = await scanAgentsFolder(agentsPath);
    }

    // 2. Scan /subagents folder
    const subagentsPath = path.join(folderPath, 'subagents');
    if (fs.existsSync(subagentsPath)) {
      const subagents = await scanAgentsFolder(subagentsPath);
      result.agents.push(...subagents);
    }

    // 3. Scan /.claude/skills folder for skills
    const skillsPath = path.join(folderPath, '.claude', 'skills');
    if (fs.existsSync(skillsPath)) {
      result.skills = await scanSkillsFolder(skillsPath);
    }

    // 4. Parse .mcp.json for MCP server configs
    const mcpJsonPath = path.join(folderPath, '.mcp.json');
    if (fs.existsSync(mcpJsonPath)) {
      result.mcpServers = parseMCPConfig(mcpJsonPath);
    }

    console.log('[Scanner] Scan complete:', {
      agents: result.agents.length,
      skills: result.skills.length,
      mcpServers: result.mcpServers.length,
    });
  } catch (error) {
    console.error('[Scanner] Error scanning folder:', error);
    throw error;
  }

  return result;
}

/**
 * Scan agents folder recursively
 */
async function scanAgentsFolder(folderPath: string): Promise<AgentDefinition[]> {
  const agents: AgentDefinition[] = [];

  function scanDirectory(dir: string, category?: string) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Recurse into subdirectories (e.g., agents/research/, agents/content/)
        scanDirectory(itemPath, item);
      } else if (item.endsWith('.md')) {
        // Parse markdown file
        try {
          const agent = parseAgentMarkdown(itemPath, category);
          if (agent) {
            agents.push(agent);
          }
        } catch (error) {
          console.warn('[Scanner] Failed to parse agent file:', itemPath, error);
        }
      }
    }
  }

  scanDirectory(folderPath);
  return agents;
}

/**
 * Parse agent markdown file
 * Format:
 * # Agent Name
 * ## Purpose
 * Description text
 * ## Instructions
 * System prompt text
 */
function parseAgentMarkdown(filePath: string, category?: string): AgentDefinition | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.md');

  // Extract agent name from first heading
  const nameMatch = content.match(/^#\s+(.+?)$/m);
  const name = nameMatch ? nameMatch[1].trim() : fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Extract purpose/description
  const purposeMatch = content.match(/##\s+Purpose\s+(.+?)(?=##|$)/s);
  const description = purposeMatch ? purposeMatch[1].trim().split('\n')[0] : undefined;

  // Extract instructions as system prompt
  const instructionsMatch = content.match(/##\s+Instructions\s+(.+?)(?=##|$)/s);
  const system_prompt = instructionsMatch ? instructionsMatch[1].trim() : content;

  // Infer emoji/avatar from content
  const emojiMatch = name.match(/^([\u{1F300}-\u{1F9FF}])/u);
  const avatar = emojiMatch ? emojiMatch[1] : getDefaultAvatar(category || fileName);

  return {
    name: name.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, ''), // Remove emoji from name
    description,
    system_prompt,
    avatar,
    model: 'claude-sonnet-4.5',
    thinking_enabled: false,
    category,
  };
}

/**
 * Scan skills folder
 */
async function scanSkillsFolder(folderPath: string): Promise<SkillDefinition[]> {
  const skills: SkillDefinition[] = [];

  const skillDirs = fs.readdirSync(folderPath);

  for (const skillDir of skillDirs) {
    const skillPath = path.join(folderPath, skillDir);
    const stat = fs.statSync(skillPath);

    if (!stat.isDirectory()) continue;

    const skillFilePath = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillFilePath)) continue;

    try {
      const skill = parseSkillMarkdown(skillFilePath, skillDir);
      if (skill) {
        skills.push(skill);
      }
    } catch (error) {
      console.warn('[Scanner] Failed to parse skill file:', skillFilePath, error);
    }
  }

  return skills;
}

/**
 * Parse skill markdown file
 * Format:
 * ---
 * name: skill-name
 * description: Description text
 * ---
 * # Skill content
 */
function parseSkillMarkdown(filePath: string, dirName: string): SkillDefinition | null {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Parse YAML frontmatter if present
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  let name = dirName;
  let description = undefined;

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const nameMatch = frontmatter.match(/name:\s*(.+)/);
    const descMatch = frontmatter.match(/description:\s*(.+)/);

    if (nameMatch) name = nameMatch[1].trim();
    if (descMatch) description = descMatch[1].trim();
  }

  // Skill content is the full markdown (can be executed as script or instructions)
  return {
    name,
    description,
    type: 'script', // Default to script type
    config: {
      content,
      filePath,
    },
  };
}

/**
 * Parse .mcp.json file
 */
function parseMCPConfig(filePath: string): MCPServerConfig[] {
  const servers: MCPServerConfig[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(content);

    if (config.mcpServers) {
      for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        const server = serverConfig as any;
        servers.push({
          name,
          command: server.command,
          args: server.args || [],
          env: server.env || {},
        });
      }
    }
  } catch (error) {
    console.error('[Scanner] Failed to parse MCP config:', error);
  }

  return servers;
}

/**
 * Get default avatar based on category or name
 */
function getDefaultAvatar(categoryOrName: string): string {
  const lower = categoryOrName.toLowerCase();

  if (lower.includes('research')) return '🔍';
  if (lower.includes('content') || lower.includes('writer')) return '✍️';
  if (lower.includes('email') || lower.includes('outreach')) return '📧';
  if (lower.includes('qualifier') || lower.includes('lead')) return '🎯';
  if (lower.includes('analyzer')) return '📊';
  if (lower.includes('apollo')) return '🚀';
  if (lower.includes('university') || lower.includes('school')) return '🎓';
  if (lower.includes('corporate') || lower.includes('company')) return '🏢';
  if (lower.includes('proposal')) return '📄';

  return '🤖'; // Default
}
