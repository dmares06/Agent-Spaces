// Shared types for AgentSpaces

// Permission Types
export type PermissionMode = 'safe' | 'ask' | 'allow-all' | 'inherit';
export type PermissionCategory = 'bash' | 'git' | 'file_write' | 'file_read' | 'network' | 'mcp';
export type PermissionDecision = 'allow' | 'deny';

export interface PermissionMemory {
  id: string;
  workspace_id: string;
  agent_id?: string;
  category: PermissionCategory;
  operation_pattern: string;
  decision: PermissionDecision;
  created_at: string;
}

// Chat Status Types
export type ChatStatus = 'active' | 'todo' | 'in_progress' | 'needs_review' | 'done' | 'archived';

export interface ChatStatusConfig {
  id: ChatStatus;
  label: string;
  color: string;
  icon: string;
}

export const CHAT_STATUS_CONFIG: ChatStatusConfig[] = [
  { id: 'active', label: 'Active', color: 'blue', icon: 'MessageSquare' },
  { id: 'todo', label: 'To Do', color: 'gray', icon: 'Circle' },
  { id: 'in_progress', label: 'In Progress', color: 'yellow', icon: 'Play' },
  { id: 'needs_review', label: 'Needs Review', color: 'purple', icon: 'Eye' },
  { id: 'done', label: 'Done', color: 'green', icon: 'Check' },
  { id: 'archived', label: 'Archived', color: 'slate', icon: 'Archive' },
];

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  folder_path?: string;
  permission_mode?: PermissionMode;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  avatar?: string;
  category?: string | null;
  system_prompt?: string;
  model: string;
  thinking_enabled: number;
  permission_mode?: PermissionMode;
  parent_agent_id?: string;
  config?: string;
  created_at: string;
}

export interface Chat {
  id: string;
  workspace_id: string;
  agent_id: string;
  title?: string;
  status?: ChatStatus;
  is_flagged?: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: string;
  thinking_content?: string;
  created_at: string;
}

export interface Skill {
  id: string;
  workspace_id?: string;
  name: string;
  description?: string;
  category?: string | null;
  type: 'mcp' | 'function' | 'script';
  config: string;
  created_at: string;
}

export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string;
  env?: string;
  workspace_id?: string;
  category?: string | null;
  enabled: number;
  created_at: string;
}

export interface Hook {
  id: string;
  workspace_id: string;
  name: string;
  event: string;
  condition?: string;
  action: string;
  action_config: string;
  enabled: number;
  created_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  agent_id?: string;              // Creator of the task
  assigned_to_agent_id?: string;  // Agent assigned to work on it
  chat_id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'planning' | 'working' | 'review' | 'needs_input' | 'complete' | 'failed';
  progress: number; // 0-100
  result?: string;
  created_at: string;
  completed_at?: string;
  started_at?: string;             // When agent started working
  last_activity?: string;          // Last status change
  // Populated from joins:
  assigned_agent_name?: string;
  assigned_agent_avatar?: string;
  creator_agent_name?: string;
  creator_agent_avatar?: string;
}

export interface Attachment {
  id: string;
  chat_id?: string;
  message_id?: string;
  name: string;
  path: string;
  mime_type?: string;
  size?: number;
  type: 'context' | 'upload' | 'reference';
  created_at: string;
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: string;
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  language: string;
  isDirty: boolean;
}

export type RuleAction = 'allow' | 'deny' | 'ask';
export type RuleCategory = 'bash' | 'git' | 'file_write' | 'file_read' | 'network' | 'mcp';

export interface SessionRule {
  id: string;
  chat_id: string;
  category: RuleCategory;
  pattern?: string;
  action: RuleAction;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  chat_id: string;
  category: string;
  operation: string;
  details?: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
}

export interface ToolExecution {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  result?: string;
  isError?: boolean;
  status: 'pending' | 'executing' | 'completed' | 'error';
}

// Agent Settings Types
export type ModelOption =
  // Anthropic (Claude)
  | 'claude-sonnet-4.5'
  | 'claude-opus-4.5'
  | 'claude-haiku-3.5'
  // OpenAI
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'o1'
  | 'o1-mini'
  // Google (Gemini)
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  // Groq
  | 'llama-3.3-70b'
  | 'llama-3.1-8b'
  | 'mixtral-8x7b'
  // OpenRouter (Multi-provider)
  | 'openrouter/auto'
  | 'openrouter/google/gemini-2.5-pro'
  | 'openrouter/deepseek/deepseek-chat-v3'
  | 'openrouter/meta-llama/llama-4-maverick'
  | 'openrouter/mistralai/mistral-large';

export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'groq' | 'openrouter';

export interface ModelInfo {
  id: ModelOption;
  name: string;
  description: string;
  provider: ModelProvider;
  supportsThinking: boolean;
  requiresApiKey: string; // Setting key like 'anthropic_api_key'
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  // Anthropic (Claude)
  {
    id: 'claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    description: 'Recommended - Fast & Capable',
    provider: 'anthropic',
    supportsThinking: true,
    requiresApiKey: 'anthropic_api_key',
  },
  {
    id: 'claude-opus-4.5',
    name: 'Claude Opus 4.5',
    description: 'Most Capable',
    provider: 'anthropic',
    supportsThinking: true,
    requiresApiKey: 'anthropic_api_key',
  },
  {
    id: 'claude-haiku-3.5',
    name: 'Claude Haiku 3.5',
    description: 'Fastest',
    provider: 'anthropic',
    supportsThinking: false,
    requiresApiKey: 'anthropic_api_key',
  },

  // OpenAI
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Latest GPT-4 - Multimodal',
    provider: 'openai',
    supportsThinking: false,
    requiresApiKey: 'openai_api_key',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Efficient GPT-4 variant',
    provider: 'openai',
    supportsThinking: false,
    requiresApiKey: 'openai_api_key',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Enhanced GPT-4',
    provider: 'openai',
    supportsThinking: false,
    requiresApiKey: 'openai_api_key',
  },
  {
    id: 'o1',
    name: 'OpenAI o1',
    description: 'Reasoning model - Best for complex problems',
    provider: 'openai',
    supportsThinking: false,
    requiresApiKey: 'openai_api_key',
  },
  {
    id: 'o1-mini',
    name: 'OpenAI o1-mini',
    description: 'Faster reasoning model',
    provider: 'openai',
    supportsThinking: false,
    requiresApiKey: 'openai_api_key',
  },

  // Google (Gemini)
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    description: 'Latest Gemini - Fast & Experimental',
    provider: 'google',
    supportsThinking: false,
    requiresApiKey: 'google_api_key',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Most capable Gemini model',
    provider: 'google',
    supportsThinking: false,
    requiresApiKey: 'google_api_key',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Fastest Gemini model',
    provider: 'google',
    supportsThinking: false,
    requiresApiKey: 'google_api_key',
  },

  // Groq (Fast Inference)
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    description: 'Meta Llama - Ultra fast inference',
    provider: 'groq',
    supportsThinking: false,
    requiresApiKey: 'groq_api_key',
  },
  {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B',
    description: 'Smaller, faster Llama',
    provider: 'groq',
    supportsThinking: false,
    requiresApiKey: 'groq_api_key',
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    description: 'Mixtral MoE - Fast & capable',
    provider: 'groq',
    supportsThinking: false,
    requiresApiKey: 'groq_api_key',
  },

  // OpenRouter (Multi-provider access)
  {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto',
    description: 'Auto-select best available model',
    provider: 'openrouter',
    supportsThinking: false,
    requiresApiKey: 'openrouter_api_key',
  },
  {
    id: 'openrouter/google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Google Gemini 2.5 Pro via OpenRouter',
    provider: 'openrouter',
    supportsThinking: false,
    requiresApiKey: 'openrouter_api_key',
  },
  {
    id: 'openrouter/deepseek/deepseek-chat-v3',
    name: 'DeepSeek V3',
    description: 'DeepSeek Chat V3 via OpenRouter',
    provider: 'openrouter',
    supportsThinking: false,
    requiresApiKey: 'openrouter_api_key',
  },
  {
    id: 'openrouter/meta-llama/llama-4-maverick',
    name: 'Llama 4 Maverick',
    description: 'Meta Llama 4 Maverick via OpenRouter',
    provider: 'openrouter',
    supportsThinking: false,
    requiresApiKey: 'openrouter_api_key',
  },
  {
    id: 'openrouter/mistralai/mistral-large',
    name: 'Mistral Large',
    description: 'Mistral Large via OpenRouter',
    provider: 'openrouter',
    supportsThinking: false,
    requiresApiKey: 'openrouter_api_key',
  },
];

// Dual Chat Types
export interface ChatConfig {
  chatId: string;
  agentId: string;
}

export type ChatLayout = 'single' | 'dual';
export type ExpandedPanel = 'primary' | 'secondary' | null;

export interface DualChatState {
  layout: ChatLayout;
  primary: ChatConfig | null;
  secondary: ChatConfig | null;
  expanded: ExpandedPanel;
}

// Task Creation Message Types
export interface TaskMetadata {
  id?: string;
  title: string;
  description?: string;
  status?: string;
}

export interface TaskCreationMessage extends Message {
  type: 'task_creation';
  status: 'creating' | 'created' | 'error';
  tasks: TaskMetadata[];
}

// Personal Task Management Types (separate from agent tasks)
export interface PersonalTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'working' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high';

  // Date/time tracking
  due_date?: string;              // ISO date string (YYYY-MM-DD)
  created_at: string;             // ISO datetime
  completed_at?: string;          // ISO datetime
  started_at?: string;            // ISO datetime
  reminder_time?: string;         // ISO datetime for notifications

  // Organization
  workspace_id?: string;          // Optional workspace tagging
  tags?: string;                  // JSON array of custom tags
  notes?: string;                 // Additional notes/context

  // Agent tracking (optional)
  created_by_agent_id?: string;   // Which agent created this (if any)
  last_modified_by_agent_id?: string; // Last agent that modified it
  last_notified_at?: string;      // Last notification timestamp
}

// Canvas Types
export interface SavedCanvas {
  id: string;
  workspace_id: string | null;
  name: string;
  thumbnail: string | null;
  data: string; // JSON stringified
  created_at: string;
  updated_at: string;
}

// Scheduled Task Types
export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  cron_expression: string;
  command: string;
  working_directory?: string;
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

// Telegram Integration Types
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
