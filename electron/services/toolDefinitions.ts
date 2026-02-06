import Anthropic from '@anthropic-ai/sdk';

/**
 * Tool definitions for Claude API
 * These tools allow agents to interact with the application UI in real-time
 */
export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_task',
    description:
      'Create a new task in the Tasks panel. Use this to track work items, todos, or progress on activities. The task will appear immediately in the UI.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'The title of the task (required, max 100 characters)',
        },
        description: {
          type: 'string',
          description: 'Optional detailed description of the task',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description:
      'Update an existing task status or progress. Use this to mark tasks as in_progress, completed, or failed, and to update progress percentage.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: {
          type: 'string',
          description: 'The ID of the task to update (required)',
        },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'failed'],
          description: 'New status for the task',
        },
        progress: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description:
            'Progress percentage (0-100). Only applicable when status is in_progress.',
        },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'attach_file',
    description:
      'Add a file to the Files section in the right panel. Use this to attach context files, references, or outputs that are relevant to the conversation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Display name for the file (required)',
        },
        path: {
          type: 'string',
          description: 'Full path to the file on the filesystem (required)',
        },
      },
      required: ['name', 'path'],
    },
  },
  {
    name: 'read_file',
    description:
      'Read the contents of a file from the filesystem. Use this to examine file contents, analyze code, or gather context.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Full path to the file to read (required)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'create_personal_task',
    description:
      'Create a personal task on the user\'s Kanban board. Use this when the user asks you to add a task, todo, reminder, or item to their personal task list. The task will appear immediately in the Personal Tasks panel.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'The title of the personal task (required)',
        },
        description: {
          type: 'string',
          description: 'Optional detailed description of the task',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Priority level: low, medium, or high (default: medium)',
        },
        status: {
          type: 'string',
          enum: ['todo', 'working', 'completed'],
          description: 'Initial status: todo (To Do), working (In Progress), or completed (Done). Default: todo',
        },
        due_date: {
          type: 'string',
          description: 'Optional due date in YYYY-MM-DD format (e.g., "2026-02-10")',
        },
      },
      required: ['title'],
    },
  },
];

// Browser automation tools (enabled when browserMode is true)
export const BROWSER_TOOLS: Anthropic.Tool[] = [
  {
    name: 'browser_navigate',
    description: 'Navigate to a URL in the browser. Use this to open web pages.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to (e.g., "https://google.com")'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'browser_click',
    description: 'Click an element on the current page using a CSS selector or @ref.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector (e.g., "button.submit") or accessibility reference (e.g., "@login-button")'
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_fill_form',
    description: 'Fill a form field with text. Use CSS selectors or @ref to target the field.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector (e.g., "#email") or @ref (e.g., "@email-input")'
        },
        value: {
          type: 'string',
          description: 'The text to fill into the field'
        }
      },
      required: ['selector', 'value']
    }
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current browser page. Returns the file path.',
    input_schema: {
      type: 'object' as const,
      properties: {
        filename: {
          type: 'string',
          description: 'Optional custom filename for the screenshot (e.g., "login-page.png")'
        }
      }
    }
  },
  {
    name: 'browser_read_content',
    description: 'Extract text content from the current page. Optionally specify a selector to extract specific content.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: {
          type: 'string',
          description: 'Optional CSS selector to extract specific content (e.g., ".article-body")'
        }
      }
    }
  },
  {
    name: 'browser_wait',
    description: 'Wait for an element to appear on the page before proceeding.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to wait for'
        },
        timeout: {
          type: 'number',
          description: 'Maximum time to wait in milliseconds (default: 5000)'
        }
      },
      required: ['selector']
    }
  }
];

/**
 * Get a subset of tools based on enabled features
 */
export function getToolsForAgent(options?: {
  tasksEnabled?: boolean;
  filesEnabled?: boolean;
  browserMode?: boolean;
  personalTasksEnabled?: boolean;
}): Anthropic.Tool[] {
  const { tasksEnabled = true, filesEnabled = true, browserMode = false, personalTasksEnabled = true } = options || {};
  const tools: Anthropic.Tool[] = [];

  if (tasksEnabled) {
    tools.push(
      AGENT_TOOLS.find((t) => t.name === 'create_task')!,
      AGENT_TOOLS.find((t) => t.name === 'update_task')!
    );
  }

  if (filesEnabled) {
    tools.push(
      AGENT_TOOLS.find((t) => t.name === 'attach_file')!,
      AGENT_TOOLS.find((t) => t.name === 'read_file')!
    );
  }

  if (personalTasksEnabled) {
    tools.push(
      AGENT_TOOLS.find((t) => t.name === 'create_personal_task')!
    );
  }

  if (browserMode) {
    tools.push(...BROWSER_TOOLS);
  }

  return tools;
}

/**
 * Helper to get all tools based on browser mode (legacy compatibility)
 */
export function getToolsForMode(browserMode: boolean = false): Anthropic.Tool[] {
  return getToolsForAgent({ browserMode });
}
