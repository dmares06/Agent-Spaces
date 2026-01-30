# AgentSpaces 🤖

A powerful Electron-based desktop application for managing AI agents, workspaces, and conversations with integrated development tools.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/Electron-33.3.1-47848F.svg)
![React](https://img.shields.io/badge/React-19.0.0-61DAFB.svg)

## ✨ Features

### 🤖 Multi-Agent Management
- Create workspace-specific and global agents
- Configure agent capabilities, system prompts, and tools
- Support for multiple AI providers (Claude, OpenAI, Google Gemini, Groq, OpenRouter)
- Drag-and-drop agent organization
- Permission management system with Safe/Ask/Allow-All modes

### 💬 Intelligent Chat Interface
- Real-time conversations with AI models
- Auto-naming of conversations
- Chat status workflow (Active, To Do, In Progress, Needs Review, Done, Archived)
- Flag important conversations
- Dual-chat mode for side-by-side comparisons
- Markdown rendering with syntax highlighting
- File attachments and context management
- Extended thinking mode (Claude Sonnet 4.5+)

### 🎨 **Visual Canvas** (NEW!)
- **Multi-tab canvas support** - Work on multiple canvases simultaneously
- **Database persistence** - All canvases saved to SQLite
- **Click-to-type anywhere** - Quick text mode for instant note-taking
- **Canvas gallery** - Browse, load, and manage all saved canvases
- Drawing tools, shapes, arrows, and text editing
- Font customization (Sans, Serif, Mono, Draw) with size controls
- Export/Import canvas as JSON
- Fullscreen mode for focused work
- Per-workspace canvas isolation

### 🛠️ Integrated Development Tools
- **Terminal**: Full PTY terminal with tab support (bash, zsh, etc.)
- **File Editor**: Monaco-based code editor with syntax highlighting
- **File Tree**: Project explorer with file operations
- **Git Integration**: Status, commits, and PR creation
- **Live Preview**: Real-time web preview

### ✅ Personal Task Management
- Kanban board with drag-and-drop
- Calendar view with task scheduling
- Priority levels and due dates
- Tags and categories

### 🔄 **Auto-Updates** (NEW!)
- Automatic update checks every 4 hours
- Download and install updates with one click
- GitHub Releases integration
- Seamless update experience

### 🔐 Security & Privacy
- Granular permission system for tool execution
- Approval-based or automatic permission modes
- Secure local API key storage (never exposed publicly)
- All data stored locally in SQLite
- No telemetry or tracking

### 🌐 Browser Automation
- Playwright integration for web scraping
- Screenshot capture
- Automated workflows

## 📦 Installation

### **Download Pre-built App**
1. Go to [Releases](https://github.com/kimberlymares/agent-workspace/releases)
2. Download the latest `.dmg` file for macOS
3. Open the DMG and drag AgentSpaces to Applications
4. Launch AgentSpaces from Applications

### **Build from Source**

#### Prerequisites
- Node.js 20+ and npm
- macOS (for building DMG)

#### Setup
```bash
# Clone the repository
git clone https://github.com/kimberlymares/agent-workspace.git
cd agent-workspace

# Install dependencies
npm install

# Run in development mode
npm run electron:dev
```

## 🚀 Usage

### **First Launch**
1. Open AgentSpaces
2. Click the gear icon (⚙️) in the sidebar
3. Go to "API Keys" tab
4. Add your API keys:
   - **Anthropic** (for Claude models) - Required for main features
   - **OpenAI** (for GPT models) - Optional
   - **Google AI** (for Gemini) - Optional
   - **Groq** (for fast inference) - Optional
   - **OpenRouter** (for multi-provider access) - Optional
   - **ElevenLabs** (for text-to-speech) - Optional

### **Creating Your First Workspace**
1. Click the `+` button in the sidebar
2. Name your workspace
3. (Optional) Select a folder path for terminal integration
4. Create agents specific to this workspace or use global agents

### **Using the Canvas**
1. Open a workspace
2. Toggle the canvas panel (canvas button in workspace toolbar)
3. **Quick Text Mode** (default ON): Click anywhere on canvas to instantly type
4. Use the toolbar to:
   - **New Tab** (+) - Create multiple canvas tabs
   - **Save** (💾) - Save canvas with a custom name
   - **Open Gallery** (📁) - Browse all saved canvases
   - **Export/Import** - Backup as JSON
   - **Clear Shapes** (🧹) - Remove all shapes from canvas
   - **Delete Canvas** (🗑️) - Permanently delete saved canvas
5. **Drawing**: Use tldraw's built-in tools (pen, shapes, arrows, etc.)
6. **Text Formatting**: Select text and use style panel for fonts, sizes, colors
7. All canvases auto-save and persist in the database

## 🛠️ Development

### **Development Workflow**

**For day-to-day development:**
```bash
npm run electron:dev
```

This provides:
- ✅ Hot module reloading for React components
- ✅ Automatic TypeScript compilation
- ✅ Instant feedback on changes
- ✅ No need to rebuild/reinstall the app

**Only build production app when:**
- Creating a release
- Testing the final packaged version
- Distributing to others

### **Available Scripts**
```bash
# Development mode (recommended for coding)
npm run electron:dev

# Build production app (for releases)
npm run electron:build

# Frontend development server only
npm run dev

# Type checking
tsc --noEmit

# Preview production build
npm run preview
```

## 🔄 Rebuilding the App

If you make changes and want to rebuild the production app on your computer:

### **Method 1: Manual Rebuild**
```bash
# Build new production version
npm run electron:build

# Install the new DMG
open release/AgentSpaces-*.dmg

# Drag to Applications and replace old version
```

### **Method 2: Quick Rebuild Alias**

Add this to your `~/.zshrc` or `~/.bashrc`:

```bash
alias rebuild-agentspaces='cd /Users/kimberlymares/Documents/agent-workspace && npm run electron:build && open release/AgentSpaces-*.dmg'
```

Then just run:
```bash
rebuild-agentspaces
```

### **Important Note**
- **For development**, just use `npm run electron:dev` - changes appear instantly!
- **For production rebuild**, the app is ~125 MB and takes ~2 minutes to build
- Production builds are only needed when:
  - Testing the final packaged app
  - Creating a GitHub release
  - Distributing to others

## 📝 Releasing New Versions

### **Automatic Release (GitHub Actions)**

When you're ready to release a new version:

```bash
# 1. Commit your changes
git add .
git commit -m "feat: Add new feature"
git push

# 2. Create version tag (triggers auto-build on GitHub)
npm version patch    # 1.0.0 → 1.0.1 (bug fixes)
# or
npm version minor    # 1.0.0 → 1.1.0 (new features)
# or
npm version major    # 1.0.0 → 2.0.0 (breaking changes)

# 3. Push tag to GitHub
git push --follow-tags

# GitHub Actions will automatically:
# ✓ Build the DMG
# ✓ Create a GitHub Release
# ✓ Upload the DMG file
# ✓ Enable auto-updates for users
```

### **Auto-Update Behavior**
- App checks for updates every 4 hours
- Users get notification when update is available
- One-click download and install
- Updates take effect after app restart

## 🏗️ Architecture

### **Project Structure**
```
agent-workspace/
├── electron/              # Electron main process
│   ├── main.ts           # App entry point with auto-updater
│   ├── preload.js        # IPC bridge (contextBridge)
│   ├── database/         # SQLite setup & migrations
│   │   ├── db.ts        # Database CRUD operations
│   │   └── schema.sql   # Database schema
│   ├── ipc/              # IPC handlers
│   │   └── handlers.ts  # All IPC endpoints
│   └── services/         # Backend services
│       ├── terminalService.ts    # PTY terminal management
│       ├── claudeService.ts      # Anthropic API
│       ├── aiService.ts          # Multi-provider AI
│       ├── githubService.ts      # GitHub integration
│       └── ...
├── src/                  # React renderer
│   ├── components/       # UI components
│   │   ├── canvas/      # Canvas components (NEW!)
│   │   ├── chat/        # Chat interface
│   │   ├── terminal/    # Terminal UI
│   │   └── ...
│   ├── pages/           # Main pages
│   ├── lib/             # Utilities, types, API client
│   └── styles/          # Global CSS
├── .github/workflows/   # GitHub Actions (auto-release)
├── dist/                # Frontend build output
├── dist-electron/       # Electron build output
└── release/             # Production builds (gitignored)
```

### **Database**
- **Location**: `~/Library/Application Support/AgentSpaces/agent-spaces.db` (macOS)
- **Type**: SQLite with better-sqlite3
- **Schema**: Foreign key constraints, indexes for performance
- **Tables**:
  - `workspaces` - Workspace configurations
  - `agents` - AI agent definitions
  - `chats` - Conversation threads
  - `messages` - Individual messages
  - `canvases` - Visual canvas data (NEW!)
  - `personal_tasks` - Task management
  - `settings` - App settings & API keys
  - `attachments` - File attachments
  - And more...

## 🔐 Security

### **API Keys**
- ✅ Stored in local SQLite database only
- ✅ Located at: `~/Library/Application Support/AgentSpaces/agent-spaces.db`
- ✅ Never committed to Git
- ✅ Not included in source code
- ✅ Each user must configure their own keys

### **Data Privacy**
- All data stored locally on your computer
- No telemetry or tracking
- No data sent to external servers (except AI provider APIs)
- Open source - audit the code yourself

### **.gitignore Protection**
The repository is configured to exclude:
```
✓ *.db, *.sqlite (databases with API keys)
✓ .env (environment variables)
✓ node_modules (dependencies)
✓ dist/, dist-electron/, release/ (build outputs)
✓ Personal data and configurations
```

### **What's Public on GitHub**
- ✅ Source code (TypeScript, React components)
- ✅ Build configuration (package.json, vite.config.ts)
- ✅ Database schema (structure only, no data)
- ❌ NO API keys
- ❌ NO user data
- ❌ NO databases or credentials

### **Forking & Cloning**
When someone forks or clones this repo, they get:
- Clean source code with no personal data
- Empty database schema (structure only)
- Instructions to add their own API keys
- A fresh installation ready to customize

## 🔧 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Electron 33, Node.js
- **Database**: SQLite (better-sqlite3)
- **Editor**: Monaco Editor
- **Terminal**: xterm.js + node-pty
- **Canvas**: tldraw v4.3.0
- **AI SDKs**:
  - @anthropic-ai/sdk (Claude)
  - openai (GPT models)
  - @google/generative-ai (Gemini)
- **Build**: Vite 6, electron-builder 25
- **Auto-Update**: electron-updater
- **Git**: simple-git
- **Browser**: Playwright

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test in development mode: `npm run electron:dev`
5. Build and test production: `npm run electron:build`
6. Commit: `git commit -m "Add amazing feature"`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

### **Development Guidelines**
- Use TypeScript for type safety
- Follow existing code style (React hooks, functional components)
- Test thoroughly in both dev and production modes
- Update README if adding new features
- Keep database migrations backward compatible

## 🐛 Known Issues

- TypeScript strict mode has some warnings in legacy files (doesn't affect functionality)
- Canvas click-to-type activates text tool but requires second click to place
- Auto-update requires app restart to install new version
- Code signing warnings on macOS (can be ignored for personal use)

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Built with amazing open source tools:
- [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- [React](https://react.dev/) - UI framework
- [tldraw](https://tldraw.dev/) - Collaborative canvas
- [xterm.js](https://xtermjs.org/) - Terminal emulation
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editing
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vite](https://vitejs.dev/) - Build tool

AI providers:
- [Anthropic](https://www.anthropic.com/) - Claude models
- [OpenAI](https://openai.com/) - GPT models
- [Google AI](https://ai.google.dev/) - Gemini models

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/kimberlymares/agent-workspace/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kimberlymares/agent-workspace/discussions)
- **Documentation**: This README and inline code comments

---

**Made with ❤️ by [Kimberly Mares](https://github.com/kimberlymares)**

*Last updated: January 2026*
