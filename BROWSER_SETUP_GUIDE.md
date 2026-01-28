# Browser Mode Setup Guide

## Quick Installation

Run these commands in your terminal:

```bash
# Step 1: Install agent-browser CLI globally
npm install -g agent-browser

# Step 2: Download Chromium browser (required for automation)
agent-browser install

# Step 3: Verify installation
agent-browser --version
```

That's it! Your browser automation is ready to use.

## How It Works

When you enable browser mode in the chat (click the 🌐 globe icon):
1. Your agent gets access to browser automation tools
2. The agent can navigate websites, click buttons, fill forms, and extract content
3. All browser commands are executed via the `agent-browser` CLI
4. Results are returned to the agent and shown in the chat

## Available Browser Commands

### Navigate to URL
```bash
agent-browser open https://example.com
```

### Click an Element
```bash
agent-browser click "button.submit"
agent-browser click "@login-button"  # Using accessibility reference
```

### Fill Form Fields
```bash
agent-browser fill "#email" "user@example.com"
agent-browser fill "@password-input" "mypassword"
```

### Take Screenshot
```bash
agent-browser screenshot result.png
```

### Extract Text Content
```bash
agent-browser extract ".article-body"
```

### Close Browser
```bash
agent-browser close
```

## Usage Examples

### Example 1: Research a Topic
**You**: (Enable 🌐 browser mode) "Go to Wikipedia and find information about quantum computing"

**Agent will**:
1. Navigate to wikipedia.org
2. Search for "quantum computing"
3. Extract the article content
4. Summarize the key points

### Example 2: Form Automation
**You**: (Enable 🌐 browser mode) "Fill out the contact form on example.com with my info"

**Agent will**:
1. Navigate to example.com/contact
2. Fill in name, email, message fields
3. Take a screenshot to show the filled form
4. Ask if you want to submit

### Example 3: Web Scraping
**You**: (Enable 🌐 browser mode) "Get the latest stock price for AAPL"

**Agent will**:
1. Navigate to a finance website
2. Search for AAPL ticker
3. Extract the current price
4. Return the data

## Security & Privacy

- Browser runs in a sandboxed environment
- No data is stored unless you explicitly save it
- Browser mode must be manually enabled for each session
- All actions are logged in the chat for transparency

## Troubleshooting

### "Command not found: agent-browser"
**Solution**: Install globally with `npm install -g agent-browser`

### "Browser not installed"
**Solution**: Run `agent-browser install` to download Chromium

### "Permission denied"
**Solution**: You may need to use `sudo` on macOS/Linux:
```bash
sudo npm install -g agent-browser
```

### Browser commands timing out
**Solution**: Some pages load slowly. The agent will retry or ask for guidance.

## Advanced Usage

### Custom Selectors
You can use CSS selectors or accessibility references (@ref):
- CSS: `"button.submit"`, `"#login-form"`, `"div.container > p"`
- Accessibility: `"@login-button"`, `"@email-field"`

### Chaining Commands
The agent can perform multiple steps automatically:
```
1. Navigate to site
2. Search for item
3. Click result
4. Extract data
5. Take screenshot
```

## Next Steps

After installation:
1. Restart your agent-workspace app
2. Open any chat
3. Click the 🌐 globe icon to enable browser mode
4. Try asking: "Go to google.com and search for something"

The agent will automatically execute browser commands and show you the results!
