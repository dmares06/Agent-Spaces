# AgentSpaces

A powerful Electron-based desktop application for managing AI agents, workspaces, and conversations with integrated development tools.

## Features

### 🤖 Multi-Agent Management
- Create workspace-specific and global agents
- Configure agent capabilities, system prompts, and tools
- Drag-and-drop agent organization
- Permission management system

### 💬 Intelligent Chat Interface
- Real-time conversations with Claude AI
- Support for multiple AI providers (Claude, OpenAI, Google Gemini)
- Auto-naming of conversations
- Markdown rendering with syntax highlighting
- File attachments and context management

### 🛠️ Integrated Development Tools
- **Terminal**: Full PTY terminal with tab support for multiple shells (bash, zsh, claude CLI, etc.)
- **File Editor**: Monaco-based code editor with syntax highlighting
- **Canvas**: Visual whiteboarding with tldraw
- **Live Preview**: Real-time web preview for development

### ✅ Personal Task Management
- Kanban board with drag-and-drop
- Calendar view with task scheduling
- Priority levels and due dates
- Tags and categories

### 🔐 Security & Permissions
- Granular permission system for tool execution
- Approval-based or automatic permission modes
- Secure API key storage

### 🌐 Browser Automation
- Playwright integration for web scraping and testing
- Screenshot capture
- Automated workflows

## Installation

### Prerequisites
- Node.js 18+ and npm
- macOS, Linux, or Windows

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/agent-spaces.git
cd agent-spaces
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run electron:dev
```

The app will launch with hot-reloading enabled. Changes to the code will automatically refresh the app.

### Production Build

Build the standalone application:

```bash
npm run electron:build
```

The built app will be in the `release/` directory:
- macOS: `release/AgentSpaces-1.0.0-arm64.dmg` or `release/mac-arm64/AgentSpaces.app`
- The DMG can be installed by dragging to Applications folder

## Development Workflow

**For active development, always use:**
```bash
npm run electron:dev
```

This provides:
- Hot module reloading for React components
- Automatic TypeScript compilation
- Instant feedback on changes
- No need to rebuild/reinstall the app

**Only build production app when:**
- Creating a release
- Testing the final packaged version
- Distributing to others

## Configuration

### API Keys

Configure API keys in the app:
1. Click the gear icon (⚙️) in the sidebar
2. Go to "API Keys" tab
3. Add your keys:
   - Anthropic (Claude)
   - OpenAI (GPT models)
   - Google AI (Gemini)
   - ElevenLabs (TTS)
   - Groq
   - OpenRouter

### Database

The app uses SQLite for data persistence:
- Location: `~/Library/Application Support/AgentSpaces/agent-spaces.db` (macOS)
- Stores: workspaces, agents, chats, messages, tasks, personal tasks, attachments

## Architecture

```
agent-spaces/
├── electron/              # Electron main process
│   ├── main.ts           # App entry point
│   ├── preload.js        # IPC bridge
│   ├── database/         # SQLite setup
│   ├── ipc/              # IPC handlers
│   └── services/         # Backend services
│       ├── terminalService.ts
│       ├── claudeService.ts
│       ├── browserService.ts
│       └── ...
├── src/                  # React renderer
│   ├── components/       # UI components
│   ├── pages/           # Main pages
│   ├── lib/             # Utilities, types
│   └── styles/          # CSS
└── release/             # Built app (gitignored)
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Electron, Node.js
- **Database**: SQLite (better-sqlite3)
- **Editor**: Monaco Editor
- **Terminal**: xterm.js + node-pty
- **Canvas**: tldraw
- **AI SDKs**: Anthropic SDK, OpenAI SDK, Google Generative AI
- **Build**: Vite, electron-builder

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Commit: `git commit -m "Add your feature"`
5. Push: `git push origin feature/your-feature`
6. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues and feature requests, please use the GitHub Issues page.
