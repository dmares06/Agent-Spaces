# Browser Mode Integration

Browser mode allows AI agents to interact with web pages using the Vercel `agent-browser` library.

## Overview

When browser mode is enabled (Globe icon in chat input), the agent can:
- Navigate to URLs
- Fill out forms
- Click buttons and links
- Extract information from web pages
- Take screenshots
- Interact with dynamic content

## Setup

### 1. Install Dependencies

```bash
npm install @anthropic-ai/agent-browser
```

### 2. Backend Integration

Add browser capabilities to your agent service:

**File: `electron/services/browserService.ts`**

```typescript
import { Browser, chromium } from 'playwright';
import { AgentBrowser } from '@anthropic-ai/agent-browser';

export class BrowserService {
  private browser: Browser | null = null;
  private agentBrowser: AgentBrowser | null = null;

  async initialize() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: false, // Set to true for production
      });
    }

    if (!this.agentBrowser) {
      this.agentBrowser = new AgentBrowser({
        browser: this.browser,
      });
    }

    return this.agentBrowser;
  }

  async navigateTo(url: string) {
    const browser = await this.initialize();
    return await browser.navigate(url);
  }

  async fillForm(selector: string, value: string) {
    const browser = await this.initialize();
    return await browser.fill(selector, value);
  }

  async click(selector: string) {
    const browser = await this.initialize();
    return await browser.click(selector);
  }

  async screenshot(): Promise<Buffer> {
    const browser = await this.initialize();
    return await browser.screenshot();
  }

  async extractContent(selector?: string): Promise<string> {
    const browser = await this.initialize();
    return await browser.extractText(selector);
  }

  async close() {
    if (this.agentBrowser) {
      await this.agentBrowser.close();
      this.agentBrowser = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const browserService = new BrowserService();
```

### 3. Add Browser Tools to Claude

When browser mode is enabled, add these tools to the Claude API request:

```typescript
const browserTools = [
  {
    name: 'navigate_to_url',
    description: 'Navigate to a specific URL',
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'fill_form_field',
    description: 'Fill out a form field on the current page',
    input_schema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the form field',
        },
        value: {
          type: 'string',
          description: 'Value to fill in',
        },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: 'click_element',
    description: 'Click on an element on the page',
    input_schema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the element to click',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'extract_page_content',
    description: 'Extract text content from the current page',
    input_schema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Optional CSS selector to extract specific content',
        },
      },
    },
  },
  {
    name: 'take_screenshot',
    description: 'Take a screenshot of the current page',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];
```

### 4. Handle Tool Execution

In your Claude service, handle browser tool executions:

```typescript
async function executeBrowserTool(toolName: string, input: any) {
  switch (toolName) {
    case 'navigate_to_url':
      await browserService.navigateTo(input.url);
      return { success: true, message: `Navigated to ${input.url}` };

    case 'fill_form_field':
      await browserService.fillForm(input.selector, input.value);
      return { success: true, message: `Filled field ${input.selector}` };

    case 'click_element':
      await browserService.click(input.selector);
      return { success: true, message: `Clicked ${input.selector}` };

    case 'extract_page_content':
      const content = await browserService.extractContent(input.selector);
      return { success: true, content };

    case 'take_screenshot':
      const screenshot = await browserService.screenshot();
      return { success: true, screenshot: screenshot.toString('base64') };

    default:
      throw new Error(`Unknown browser tool: ${toolName}`);
  }
}
```

### 5. Update Message Sending Logic

Modify `ChatPanel.tsx` to check for browser mode:

```typescript
async function handleSendMessage(content: string, mentionedAgents?: Agent[], attachedFiles?: File[]) {
  // ... existing code ...

  const result = await electronAPI.chat.sendMessage({
    chat_id: chat.id,
    content: enrichedContent,
    browserMode: browserMode, // Pass browser mode flag
  });

  // ... existing code ...
}
```

### 6. Backend Handler

Update the chat message handler:

```typescript
ipcMain.handle('chat:send-message', async (_event, data) => {
  const { chat_id, content, browserMode } = data;

  // Build tools array
  const tools = [...defaultTools];

  if (browserMode) {
    tools.push(...browserTools);
  }

  // Send to Claude with tools
  const response = await claudeService.sendMessage({
    messages: conversationHistory,
    tools,
    // ... other options
  });

  // Handle tool executions
  for (const toolUse of response.tool_uses) {
    if (browserTools.find(t => t.name === toolUse.name)) {
      const result = await executeBrowserTool(toolUse.name, toolUse.input);
      // Send tool result back to Claude
    }
  }

  // ... rest of handler
});
```

## Usage Examples

### Example 1: Web Research

```
User: [Browser Mode ON] Go to wikipedia.org and search for "Artificial Intelligence"

Agent uses:
1. navigate_to_url("https://wikipedia.org")
2. fill_form_field("#searchInput", "Artificial Intelligence")
3. click_element("button[type='submit']")
4. extract_page_content()
5. Summarizes the content
```

### Example 2: Form Automation

```
User: [Browser Mode ON] Fill out the contact form on example.com with my info

Agent uses:
1. navigate_to_url("https://example.com/contact")
2. fill_form_field("#name", "John Doe")
3. fill_form_field("#email", "john@example.com")
4. fill_form_field("#message", "Hello, I'm interested...")
5. take_screenshot() to show the filled form
```

### Example 3: Data Extraction

```
User: [Browser Mode ON] Get the latest stock price for AAPL from Yahoo Finance

Agent uses:
1. navigate_to_url("https://finance.yahoo.com/quote/AAPL")
2. extract_page_content(".price")
3. Returns the extracted price
```

## Security Considerations

1. **User Consent**: Browser mode requires explicit user activation (Globe button)
2. **Sandboxing**: Run browser in isolated environment
3. **Rate Limiting**: Limit number of browser actions per message
4. **URL Whitelist**: Consider restricting to approved domains
5. **Screenshot Privacy**: Be careful with sensitive information in screenshots

## UI Indicators

- **Globe Icon**: Shows browser mode is active (blue when ON)
- **Browser Control Message**: Displays "Browser control enabled - Agent can interact with web pages"
- **Tool Executions**: Show in chat as agent performs browser actions

## Performance Tips

1. **Lazy Loading**: Only initialize browser when browser mode is first used
2. **Connection Pooling**: Reuse browser instances across requests
3. **Headless Mode**: Use headless: true in production for better performance
4. **Cleanup**: Always close browser sessions after use

## Troubleshooting

### Browser doesn't launch
- Check Playwright is installed: `npx playwright install chromium`
- Verify permissions for browser automation

### Tool executions failing
- Check CSS selectors are correct
- Wait for page to load before interacting
- Use screenshots to debug page state

### Slow performance
- Use headless mode
- Close browser when not needed
- Consider timeout limits for long operations

## Future Enhancements

1. **Browser History**: Show visited URLs in chat
2. **Interactive Preview**: Embed browser view in app
3. **Session Persistence**: Save browser state between messages
4. **Multi-tab Support**: Allow agent to work with multiple tabs
5. **Download Management**: Handle file downloads from web pages
