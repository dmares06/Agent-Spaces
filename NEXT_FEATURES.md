# AgentSpaces - Next Feature Recommendations

Based on Orbit.build competitive analysis and current gaps.

---

## ✅ COMPLETED

1. **Monaco Editor Integration** - Full VS Code-level editing ✓
2. **File Tree Navigation** - Visual file explorer ✓
3. **Multi-Tab Support** - Multiple open files ✓
4. **Enhanced File Tree** - Toolbar, search, git branch indicator ✓

---

## 🔥 HIGH PRIORITY (Next 2-4 Weeks)

### 1. **Visual Diff Viewer**
**Impact**: 🔥🔥🔥 Critical for code review workflow

**What**: Side-by-side comparison of code changes before applying

**Why**: Currently, when agents suggest code changes, users can't easily see what changed. This builds trust and prevents mistakes.

**Implementation**:
```typescript
// Use Monaco's built-in DiffEditor
import { DiffEditor } from '@monaco-editor/react';

// Component: src/components/editor/DiffViewer.tsx
interface DiffViewerProps {
  original: string;
  modified: string;
  language: string;
  onAccept: () => void;
  onReject: () => void;
}
```

**User Experience**:
1. Agent suggests code change in chat
2. "Review Changes" button appears
3. Modal opens showing diff view
4. User clicks "Accept" or "Reject"
5. Changes applied to file

**Estimated Time**: 3-5 days

---

### 2. **Agent Code Generation Mode**
**Impact**: 🔥🔥🔥🔥 Game Changer - transforms app from chat tool to IDE

**What**: Agents can write code directly to workspace files

**Why**: Currently agents only chat. They can't modify project files automatically like Orbit agents can.

**Implementation**:
```typescript
// 1. Add mode to Agent settings
interface Agent {
  mode: 'chat' | 'code' | 'review';
  can_write_files: boolean;
  requires_approval: boolean;
}

// 2. Parse code blocks from agent responses
function parseCodeBlocks(response: string): CodeBlock[] {
  // Extract ```language ... ``` blocks
  // Detect file paths in comments
}

// 3. New service: electron/services/codeGenerationService.ts
class CodeGenerationService {
  async writeCodeToFile(code: string, filePath: string): Promise<void>
  async createDiff(original: string, modified: string): Promise<Diff>
  async applyChanges(diff: Diff): Promise<void>
}
```

**User Experience**:
1. User: "Build a REST API with Express and TypeScript"
2. Agent generates code and says: "I've created 3 files for your API"
3. Files appear in diff viewer for approval
4. User reviews and accepts changes
5. Files are written to workspace

**Estimated Time**: 1-2 weeks

---

### 3. **Git Integration UI**
**Impact**: 🔥🔥🔥 Professional developer workflow

**What**: Visual Git interface (status, stage, commit, branch, push/pull)

**Why**: Terminal-only Git is clunky. Visual Git is expected in modern IDEs.

**Implementation**:
```bash
npm install simple-git
```

```typescript
// Service: electron/services/gitService.ts
import simpleGit from 'simple-git';

class GitService {
  async getStatus(repoPath: string): Promise<GitStatus>
  async getCurrentBranch(repoPath: string): Promise<string>
  async listBranches(repoPath: string): Promise<string[]>
  async createBranch(repoPath: string, branchName: string): Promise<void>
  async switchBranch(repoPath: string, branchName: string): Promise<void>
  async stageFiles(repoPath: string, files: string[]): Promise<void>
  async commit(repoPath: string, message: string): Promise<void>
  async push(repoPath: string): Promise<void>
  async pull(repoPath: string): Promise<void>
}

// UI: src/components/git/GitPanel.tsx
// - File status (modified, staged, untracked)
// - Stage/unstage buttons
// - Commit message input
// - Branch dropdown
// - Push/pull buttons
```

**UI Layout** (add to right panel):
```
┌─ Git Panel ──────────────────┐
│ Branch: main ▼    [Pull] [Push]│
├──────────────────────────────┤
│ Changes (3)                   │
│ ✓ Modified: server.ts        │
│ ✓ Modified: routes.ts        │
│ ? Untracked: new-file.ts     │
├──────────────────────────────┤
│ Commit message:               │
│ [Add new API endpoints      ]│
│                      [Commit] │
└──────────────────────────────┘
```

**Estimated Time**: 1 week

---

## 🎯 MEDIUM PRIORITY (Next 1-2 Months)

### 4. **One-Click Deployment**
**Impact**: 🔥🔥🔥🔥 Orbit's killer feature

**What**: Deploy to Vercel, Netlify, Railway with one click

**Why**: Complete "idea to production" workflow

**Implementation**:
```typescript
// Services:
- electron/services/vercelService.ts
- electron/services/netlifyService.ts
- electron/services/railwayService.ts

// UI: src/components/deployment/DeployPanel.tsx
```

**User Experience**:
1. User builds app with agent
2. Clicks "Deploy" button
3. Selects platform (Vercel/Netlify/Railway)
4. Enters API token (one-time)
5. Deployment starts, logs stream in terminal
6. Live URL appears when complete

**Estimated Time**: 2 weeks

---

### 5. **Browser Preview**
**Impact**: 🔥🔥 Visual feedback for web development

**What**: Embedded Chromium browser to preview web apps

**Why**: Instant visual feedback when building UIs

**Implementation**:
```typescript
// Use Electron's BrowserView
import { BrowserView } from 'electron';

// Component: src/components/preview/BrowserPreview.tsx
// - Address bar
// - Refresh button
// - DevTools toggle
// - Responsive viewport selector (mobile/tablet/desktop)
```

**UI Layout**: Split view with editor on left, preview on right

**Estimated Time**: 1 week

---

### 6. **Project Templates**
**Impact**: 🔥🔥 Faster onboarding

**What**: Quick-start templates (Next.js, Express, React, etc.)

**Why**: Users can start building immediately

**Implementation**:
```typescript
// Templates stored in:
~/.claude/templates/
- next-typescript/
- express-api/
- react-vite/
- fastapi-python/

// UI: Modal when creating new workspace
// "Start from template" option
```

**Estimated Time**: 3-5 days

---

### 7. **Multi-File Agent Context**
**Impact**: 🔥🔥 Better AI understanding

**What**: Agent sees entire project structure, not just chat history

**Why**: Currently agents have no context about the codebase

**Implementation**:
```typescript
// Add to chat context when sending to Claude:
interface ChatContext {
  workspace_path: string;
  open_files: OpenFile[];
  project_structure: FileTree;
  current_file?: string;
  git_branch?: string;
  relevant_files?: string[];  // AI-selected based on conversation
}

// Use Claude's file attachment feature
// Or embed in system prompt
```

**Example System Prompt**:
```
You are working in a Next.js project with this structure:
/src
  /app
    page.tsx
    layout.tsx
  /components
    Header.tsx

Currently editing: src/app/page.tsx
Open files: src/app/page.tsx, src/components/Header.tsx
Git branch: feature/new-homepage
```

**Estimated Time**: 1 week

---

## 💡 NICE TO HAVE (Future)

### 8. **Agent Permission System**
**Impact**: 🔥 Security and trust

**What**: Explicit permissions for file operations

**Implementation**:
```typescript
interface AgentPermissions {
  can_read_files: boolean;
  can_write_files: boolean;
  can_execute_commands: boolean;
  requires_approval: boolean;
  allowed_directories: string[];
}
```

**Estimated Time**: 3-5 days

---

### 9. **Code Execution Sandbox**
**Impact**: 🔥 Safety for testing

**What**: Run code in isolated Docker container

**Why**: Test agent-generated code safely

**Estimated Time**: 1-2 weeks

---

### 10. **Agent Marketplace**
**Impact**: 🔥 Community growth

**What**: Share and download pre-configured agents

**Implementation**:
- Public agent registry (JSON API)
- Import/export agent configs
- Rating system
- Categories (Web Dev, Data Science, DevOps)

**Estimated Time**: 2-3 weeks

---

### 11. **Real-time Collaboration**
**Impact**: 🔥🔥 Team workflows

**What**: Multiple users in same workspace

**Implementation**:
- WebSocket server for real-time sync
- Operational Transform for conflict resolution
- User cursors and presence
- Chat sync

**Estimated Time**: 1-2 months

---

### 12. **Plugin System**
**Impact**: 🔥 Extensibility

**What**: Third-party plugins for custom tools/agents

**Implementation**:
```typescript
interface Plugin {
  name: string;
  version: string;
  tools: Tool[];
  agents: AgentConfig[];
  hooks: Hook[];
}
```

**Estimated Time**: 2-3 weeks

---

## 📅 RECOMMENDED ROADMAP

### **Phase 1: Core IDE Features** (4-6 weeks)
Focus: Transform from chat tool to development environment
- ✅ Monaco Editor (DONE)
- ✅ File Tree (DONE)
- 🔄 Visual Diff Viewer
- 🔄 Agent Code Generation Mode
- 🔄 Git Integration UI

### **Phase 2: Deployment & Preview** (3-4 weeks)
Focus: Complete "idea to production" workflow
- One-Click Deployment
- Browser Preview
- Multi-File Agent Context

### **Phase 3: Templates & Onboarding** (2-3 weeks)
Focus: User acquisition and retention
- Project Templates
- Improved onboarding flow
- Documentation

### **Phase 4: Polish & Security** (2-3 weeks)
Focus: Production readiness
- Agent Permission System
- Error handling improvements
- Performance optimization

### **Phase 5: Community & Extensibility** (1-2 months)
Focus: Ecosystem growth
- Agent Marketplace
- Plugin System
- Public API

---

## 🎯 KEY DIFFERENTIATORS vs Orbit

Don't compete on:
- Web-based accessibility
- Zero-config (you're Electron)
- "Vibe coder" market

**Compete on**:
1. ✅ **Privacy** - Local-first, complete data control
2. ✅ **Multi-workspace** - Manage multiple projects
3. ✅ **Desktop integration** - Terminal, file system, native features
4. ✅ **Multi-model support** - Not locked to Claude
5. 🔄 **Professional Git workflows** - Visual Git UI
6. 🔄 **Team collaboration** - Workspace sharing (future)

---

## 📊 PRIORITY MATRIX

```
High Impact + Easy:
- Git Integration (1 week)
- Project Templates (3-5 days)
- Multi-File Context (1 week)

High Impact + Hard:
- Agent Code Generation (1-2 weeks)
- Visual Diff Viewer (3-5 days)
- One-Click Deployment (2 weeks)

Low Impact + Easy:
- Agent Permission System (3-5 days)

Low Impact + Hard:
- Real-time Collaboration (1-2 months)
- Plugin System (2-3 weeks)
```

**Recommended Next 3 Features**:
1. **Visual Diff Viewer** (3-5 days, high impact)
2. **Git Integration** (1 week, professional workflow)
3. **Agent Code Generation** (1-2 weeks, game changer)

This will give you Orbit's core IDE experience while maintaining your local-first advantage.
