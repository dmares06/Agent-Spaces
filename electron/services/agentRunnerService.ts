/**
 * Agent Runner Service — Programmatic agent execution with knowledge parsing
 *
 * Executes agents outside of the chat UI (e.g., from the scheduler)
 * and parses structured output blocks for the Knowledge Store.
 */

import { BrowserWindow } from 'electron';
import * as db from '../database/db.js';
import * as aiService from './aiService.js';
import type { KnowledgeEntry, KnowledgeLearning } from '../../src/lib/types';

// Parsed output types
interface ParsedKnowledgeEntry {
  category: string;
  title: string;
  content: string;
  source?: string;
  confidence: number;
  tags?: string[];
}

interface ParsedLearning {
  trigger: string;
  lesson: string;
  action: string;
}

interface AgentRunResult {
  agentId: string;
  agentName: string;
  output: string;
  knowledgeEntries: KnowledgeEntry[];
  learnings: KnowledgeLearning[];
  error?: string;
}

/**
 * Run an agent programmatically (used by scheduler and manual triggers)
 */
export async function runAgent(
  agentId: string,
  workspaceId: string,
  triggerContext?: string
): Promise<AgentRunResult> {
  console.log(`[AgentRunner] Starting agent run: ${agentId} in workspace: ${workspaceId}`);

  const agent = db.getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // Build context with recent knowledge
  const knowledgeContext = buildAgentContext(workspaceId, agentId);

  // Build system prompt with knowledge injection
  const today = new Date().toISOString().split('T')[0];
  let systemPrompt = agent.system_prompt || '';
  systemPrompt += `\n\n## Context\nToday's date: ${today}`;

  if (knowledgeContext) {
    systemPrompt += `\n\n## Recent Knowledge Store\n${knowledgeContext}`;
  }

  if (triggerContext) {
    systemPrompt += `\n\n## Trigger Context\n${triggerContext}`;
  }

  // Build user message
  const userMessage = triggerContext
    ? `Execute your scheduled task. Trigger: ${triggerContext}`
    : 'Execute your scheduled task. Scan for new intelligence and report your findings using the structured output format.';

  const messages = [
    { role: 'user' as const, content: userMessage },
  ];

  try {
    // Use streamMessage (no tools needed for scheduled agent runs)
    const mainWindow = BrowserWindow.getAllWindows()[0] || null;
    const response = await aiService.streamMessage(
      messages,
      {
        systemPrompt,
        model: agent.model || 'claude-sonnet-4.5',
        thinkingEnabled: agent.thinking_enabled === 1,
      },
      {
        onText: () => {},
        onThinking: () => {},
        onToolUse: () => {},
        onToolResult: () => {},
        onError: (error) => console.error(`[AgentRunner] Stream error for ${agent.name}:`, error),
      },
      mainWindow
    );

    console.log(`[AgentRunner] Agent "${agent.name}" completed. Output length: ${response.content.length}`);

    // Parse structured output
    const parsedEntries = parseKnowledgeOutput(response.content);
    const parsedLearnings = parseLearningOutput(response.content);

    // Store knowledge entries
    const storedEntries: KnowledgeEntry[] = [];
    for (const entry of parsedEntries) {
      try {
        const stored = db.createKnowledgeEntry({
          workspace_id: workspaceId,
          agent_id: agentId,
          category: entry.category,
          title: entry.title,
          content: entry.content,
          source: entry.source,
          confidence: entry.confidence,
          tags: entry.tags ? JSON.stringify(entry.tags) : undefined,
        });
        storedEntries.push(stored);
        console.log(`[AgentRunner] Stored knowledge entry: ${entry.title}`);
      } catch (err) {
        console.error(`[AgentRunner] Failed to store knowledge entry:`, err);
      }
    }

    // Store learnings
    const storedLearnings: KnowledgeLearning[] = [];
    for (const learning of parsedLearnings) {
      try {
        const stored = db.createKnowledgeLearning({
          workspace_id: workspaceId,
          agent_id: agentId,
          trigger: learning.trigger,
          lesson: learning.lesson,
          action: learning.action,
          success_count: 0,
          failure_count: 0,
        });
        storedLearnings.push(stored);
        console.log(`[AgentRunner] Stored learning: ${learning.trigger}`);
      } catch (err) {
        console.error(`[AgentRunner] Failed to store learning:`, err);
      }
    }

    console.log(`[AgentRunner] Run complete. Entries: ${storedEntries.length}, Learnings: ${storedLearnings.length}`);

    return {
      agentId,
      agentName: agent.name,
      output: response.content,
      knowledgeEntries: storedEntries,
      learnings: storedLearnings,
    };
  } catch (error: any) {
    console.error(`[AgentRunner] Agent "${agent.name}" failed:`, error);
    return {
      agentId,
      agentName: agent.name,
      output: '',
      knowledgeEntries: [],
      learnings: [],
      error: error.message,
    };
  }
}

/**
 * Parse ---KNOWLEDGE_ENTRY--- blocks from agent output
 */
export function parseKnowledgeOutput(output: string): ParsedKnowledgeEntry[] {
  const entries: ParsedKnowledgeEntry[] = [];
  const regex = /---KNOWLEDGE_ENTRY---\s*([\s\S]*?)---END_ENTRY---/g;
  let match;

  while ((match = regex.exec(output)) !== null) {
    const block = match[1].trim();
    try {
      const entry = parseEntryBlock(block);
      if (entry) {
        entries.push(entry);
      }
    } catch (err) {
      console.error('[AgentRunner] Failed to parse knowledge entry block:', err);
    }
  }

  return entries;
}

/**
 * Parse ---LEARNING--- blocks from agent output
 */
export function parseLearningOutput(output: string): ParsedLearning[] {
  const learnings: ParsedLearning[] = [];
  const regex = /---LEARNING---\s*([\s\S]*?)---END_LEARNING---/g;
  let match;

  while ((match = regex.exec(output)) !== null) {
    const block = match[1].trim();
    try {
      const learning = parseLearningBlock(block);
      if (learning) {
        learnings.push(learning);
      }
    } catch (err) {
      console.error('[AgentRunner] Failed to parse learning block:', err);
    }
  }

  return learnings;
}

/**
 * Parse a single knowledge entry block into structured data
 */
function parseEntryBlock(block: string): ParsedKnowledgeEntry | null {
  const lines = block.split('\n');
  const data: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();
    if (key && value) {
      data[key] = value;
    }
  }

  if (!data.category || !data.title || !data.content) {
    return null;
  }

  let tags: string[] | undefined;
  if (data.tags) {
    try {
      tags = JSON.parse(data.tags);
    } catch {
      // Try comma-separated fallback
      tags = data.tags.replace(/[\[\]"]/g, '').split(',').map(t => t.trim()).filter(Boolean);
    }
  }

  return {
    category: data.category,
    title: data.title,
    content: data.content,
    source: data.source,
    confidence: parseInt(data.confidence, 10) || 50,
    tags,
  };
}

/**
 * Parse a single learning block into structured data
 */
function parseLearningBlock(block: string): ParsedLearning | null {
  const lines = block.split('\n');
  const data: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();
    if (key && value) {
      data[key] = value;
    }
  }

  if (!data.trigger || !data.lesson || !data.action) {
    return null;
  }

  return {
    trigger: data.trigger,
    lesson: data.lesson,
    action: data.action,
  };
}

/**
 * Build a context string from recent knowledge for agent injection
 */
export function buildAgentContext(workspaceId: string, agentId: string): string {
  const entries = db.getKnowledgeForAgent(workspaceId, undefined, 20);

  if (entries.length === 0) {
    return '';
  }

  const lines: string[] = ['Here are recent intelligence entries from the knowledge store:\n'];

  for (const entry of entries) {
    lines.push(`- [${entry.category}] ${entry.title} (confidence: ${entry.confidence}%)`);
    lines.push(`  ${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}`);
    if (entry.source) {
      lines.push(`  Source: ${entry.source}`);
    }
    lines.push('');
  }

  // Also include recent learnings
  const learnings = db.getKnowledgeLearnings(workspaceId, agentId);
  if (learnings.length > 0) {
    lines.push('\nRelevant learnings from past runs:\n');
    for (const learning of learnings.slice(0, 10)) {
      lines.push(`- When: ${learning.trigger}`);
      lines.push(`  Lesson: ${learning.lesson}`);
      lines.push(`  Action: ${learning.action}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
