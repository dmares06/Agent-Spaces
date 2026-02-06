import fs from 'fs';
import path from 'path';

export interface SlashCommand {
  name: string;           // e.g., "daily", "draft-corp-email"
  description: string;
  type: 'command' | 'skill';
  filePath: string;
  content: string;        // Full markdown content
}

/**
 * Get all slash commands from a workspace's folder
 */
export async function getSlashCommands(folderPath: string): Promise<SlashCommand[]> {
  console.log('[SlashCommandService] Scanning for commands in:', folderPath);

  const commands: SlashCommand[] = [];

  try {
    // Check for .claude directory
    const claudeDir = path.join(folderPath, '.claude');
    if (!fs.existsSync(claudeDir)) {
      console.log('[SlashCommandService] No .claude directory found');
      return commands;
    }

    // Scan commands folder (.claude/commands/*.md)
    const commandsDir = path.join(claudeDir, 'commands');
    if (fs.existsSync(commandsDir)) {
      const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'));

      for (const file of commandFiles) {
        try {
          const filePath = path.join(commandsDir, file);
          const command = parseCommandFile(filePath);
          if (command) {
            commands.push(command);
          }
        } catch (error) {
          console.warn('[SlashCommandService] Failed to parse command file:', file, error);
        }
      }
    }

    // Scan skills folder (.claude/skills/*/SKILL.md)
    const skillsDir = path.join(claudeDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      const skillDirs = fs.readdirSync(skillsDir);

      for (const skillDir of skillDirs) {
        const skillPath = path.join(skillsDir, skillDir);
        const stat = fs.statSync(skillPath);

        if (!stat.isDirectory()) continue;

        const skillFilePath = path.join(skillPath, 'SKILL.md');
        if (!fs.existsSync(skillFilePath)) continue;

        try {
          const skill = parseSkillFile(skillFilePath, skillDir);
          if (skill) {
            commands.push(skill);
          }
        } catch (error) {
          console.warn('[SlashCommandService] Failed to parse skill file:', skillFilePath, error);
        }
      }
    }

    console.log('[SlashCommandService] Found', commands.length, 'commands/skills');
  } catch (error) {
    console.error('[SlashCommandService] Error scanning for commands:', error);
  }

  return commands;
}

/**
 * Parse a command markdown file
 * Format:
 * # /command-name
 * Description paragraph
 * ...rest of content
 */
function parseCommandFile(filePath: string): SlashCommand | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.md');

  // Extract command name from first heading (e.g., "# /draft-corp-email")
  const headingMatch = content.match(/^#\s+\/(\S+)/m);
  const name = headingMatch ? headingMatch[1] : fileName;

  // Extract description from first paragraph after heading
  let description = '';
  const lines = content.split('\n');
  let foundHeading = false;

  for (const line of lines) {
    if (line.startsWith('# /')) {
      foundHeading = true;
      continue;
    }
    if (foundHeading && line.trim()) {
      // Skip if it's another heading or code block
      if (!line.startsWith('#') && !line.startsWith('```') && !line.startsWith('|')) {
        description = line.trim();
        break;
      }
    }
  }

  // Fallback: use filename as description
  if (!description) {
    description = name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return {
    name,
    description,
    type: 'command',
    filePath,
    content,
  };
}

/**
 * Parse a skill markdown file with YAML frontmatter
 * Format:
 * ---
 * name: skill-name
 * description: Description text
 * ---
 * # Rest of content
 */
function parseSkillFile(filePath: string, dirName: string): SlashCommand | null {
  const content = fs.readFileSync(filePath, 'utf-8');

  let name = dirName;
  let description = '';

  // Parse YAML frontmatter if present
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];

    // Extract name
    const nameMatch = frontmatter.match(/name:\s*(.+)/);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }

    // Extract description
    const descMatch = frontmatter.match(/description:\s*(.+)/);
    if (descMatch) {
      description = descMatch[1].trim();
    }
  }

  // Fallback description: look for first heading and following paragraph
  if (!description) {
    const headingMatch = content.match(/^#\s+(.+?)$/m);
    if (headingMatch) {
      description = headingMatch[1].trim();
    } else {
      description = name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  return {
    name,
    description,
    type: 'skill',
    filePath,
    content,
  };
}
