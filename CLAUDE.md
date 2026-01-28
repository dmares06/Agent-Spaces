# AgentSpaces - Project Memory

## Overview
AgentSpaces is an Electron desktop app for managing AI agents, workspaces, and conversations. Built with React 19, TypeScript, Vite, Tailwind CSS, and SQLite.

## Key Features Implemented

### Integrated Terminal (Jan 2026)
- **Location**: Bottom panel in workspace view, toggle with `Ctrl+`` or terminal button
- **Resizable**: Drag the top edge (100px - 600px range)
- **Working Directory**: Uses workspace's `folder_path`
- **Tech Stack**: node-pty (backend PTY), @xterm/xterm (frontend terminal emulation)

**Key Files:**
- `electron/services/terminalService.ts` - PTY session management
- `src/components/terminal/TerminalPanel.tsx` - Terminal UI component
- `src/pages/WorkspacePage.tsx` - Terminal integration (state: `showTerminal`, `terminalHeight`)

### Agent Movement & Drag-Drop
- Agents can be moved between workspaces and global agents via settings dropdown or drag-and-drop
- `src/components/sidebar/CollapsibleSection.tsx` - Drop zone handling with `dragCounter` ref
- `src/components/agent/sections/LocationSection.tsx` - Settings dropdown for agent location

### Chat Auto-Naming & Rename (Jan 2026)
- **Auto-naming**: When a chat starts, Claude automatically generates a title based on the first message
- **Manual Rename**: Double-click chat title in sidebar OR click `...` menu > Rename
- **Delete**: Click `...` menu > Delete

**Key Files:**
- `src/components/sidebar/ChatList.tsx` - Inline editing, context menu
- `src/components/chat/ChatPanel.tsx` - `generateChatTitle()` triggers after first message
- `electron/ipc/handlers.ts` - `chat:update`, `chat:generate-title` handlers
- `electron/services/claudeService.ts` - `sendSimpleMessage()` for fast title generation (uses Haiku)

### Global API Keys (Jan 2026)
- **Location**: Global Settings > API Keys tab (gear icon in sidebar)
- **Supported Services**:
  - Anthropic (Claude) - with connection testing
  - OpenAI (GPT models)
  - Google AI (Gemini)
  - ElevenLabs (TTS)
  - Groq (fast inference)
  - OpenRouter (multi-provider)
- **Storage**: SQLite `settings` table with keys like `anthropic_api_key`, `openai_api_key`, etc.
- **Security**: Keys stored locally, never shared externally

**Key Files:**
- `src/components/settings/sections/ApiKeysSection.tsx` - Multi-key management UI
- `src/components/settings/GlobalSettingsModal.tsx` - Settings modal container
- `electron/database/db.ts` - `getSetting()` / `setSetting()` for key storage

### Data Persistence
- **Database**: `~/Library/Application Support/AgentSpaces/agent-spaces.db` (SQLite via better-sqlite3)
- All workspaces, agents, chats, messages, tasks, attachments are persisted
- Global agents have `workspace_id = NULL`

## Architecture

```
agent-workspace/
├── electron/           # Electron main process
│   ├── main.ts        # App entry point
│   ├── preload.js     # IPC bridge
│   ├── database/      # SQLite setup
│   ├── ipc/           # IPC handlers
│   └── services/      # Backend services (terminal, claude, etc.)
├── src/               # React renderer
│   ├── components/    # UI components
│   ├── pages/         # Main pages (WorkspacePage)
│   └── lib/           # Utilities, types, electronAPI
└── dist-electron/     # Compiled Electron code
```

## Build Commands
```bash
npm run dev           # Vite dev server only
npm run electron:dev  # Full Electron + Vite dev
npm run build         # Production build + electron-builder
```

## Native Modules
Both `better-sqlite3` and `node-pty` are externalized in `vite.config.ts` for proper Electron loading.

## MO_Workflow Integration
Shell aliases added to `~/.zshrc` for invoking Claude Code slash commands:
- `daily` - Daily workflow command center
- `corp` / `run-corp-pipeline` - Corporate lead pipeline
- `uni` / `run-athletics-pipeline` - University athletics pipeline
- `find-corp-leads`, `find-school-contacts`, `qualify-company`
- `draft-corp-email`, `draft-athletics-email`
- `sequence` / `seq` - Sequence management
- `compete` - Competitive intelligence

These aliases work from any terminal (including AgentSpaces terminal) and launch Claude Code with the respective slash command.
