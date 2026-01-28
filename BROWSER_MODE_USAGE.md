# Browser Mode - User Guide

## Quick Start

1. **Install browser** (one-time setup):
   ```bash
   npm install -g agent-browser
   agent-browser install
   ```

2. **Enable browser mode** in chat:
   - Click the 🌐 globe icon in the chat input
   - Icon turns blue when enabled

3. **Ask your agent to browse**:
   - "Go to google.com and search for AI"
   - "Fill out this form on example.com"
   - "Take a screenshot of wikipedia.org"

## What Agents Can Do

When browser mode is enabled, agents can:
- **Navigate** to any URL
- **Click** buttons, links, and elements
- **Fill forms** with text
- **Take screenshots** of pages
- **Read content** from pages
- **Wait** for elements to load

## Example Requests

### Research
"Go to Wikipedia and find information about quantum computing"

### Form Automation
"Navigate to example.com/contact and fill in my name and email"

### Web Scraping
"Go to news.ycombinator.com and get the top 5 stories"

### Testing
"Go to my local app at localhost:3000 and test the login form"

## Tips

- Always enable 🌐 before asking to browse
- Be specific about URLs (include https://)
- Agents work best with clear, step-by-step instructions
- Screenshots are saved to your temp directory

## Troubleshooting

**"Browser command failed"**
→ Make sure `agent-browser` is installed globally

**"Element not found"**
→ The page may have changed or the selector is wrong
→ Ask agent to read page content first

**Browser doesn't open**
→ Run `agent-browser install` to download Chromium

## Technical Details

### Screenshot Location
Screenshots are saved to: `/tmp/agent-workspace-screenshots/`

### Supported Selectors
- CSS selectors: `#id`, `.class`, `button.submit`
- Accessibility references: `@login-button` (when supported by page)

### Browser Tools Available
1. `browser_navigate` - Navigate to a URL
2. `browser_click` - Click an element
3. `browser_fill_form` - Fill a form field
4. `browser_screenshot` - Take a screenshot
5. `browser_read_content` - Extract page content
6. `browser_wait` - Wait for an element

## Advanced Usage

### Multi-step Workflows
You can ask agents to perform complex multi-step workflows:

```
"Go to github.com, search for 'electron', click the first result,
and take a screenshot of the README"
```

### Form Filling
For forms with multiple fields:

```
"Go to example.com/signup and fill in:
- Name: John Doe
- Email: john@example.com
- Click the submit button"
```

### Content Extraction
Extract specific information from pages:

```
"Go to news.ycombinator.com and extract the titles and URLs
of the top 5 posts"
```

## Security & Privacy

- Browser sessions are local to your machine
- No data is sent to external services except the websites you visit
- Screenshots are stored locally in your temp directory
- Browser mode requires explicit activation (🌐 icon)

## Known Limitations

- Browser runs in the background (no visible window by default)
- Some websites may block automated browsers
- JavaScript-heavy sites may require wait times
- File downloads are not yet supported

## Updates & Feedback

For issues or feature requests, please check the agent-workspace GitHub repository.
